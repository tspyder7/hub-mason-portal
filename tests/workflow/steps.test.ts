import { AppContext } from '../../src/context/app-context';
import type { StepDefinition } from '../../src/types/step';
import { StepStatus } from '../../src/utils/constants';
import { upsertStatusComment } from '../../src/workflow/status-comment';
import {
    addStepDetails,
    beginStep,
    cancelPendingSteps,
    createSteps,
    failActiveStep,
    failStep,
    finishStep,
    toStepError,
} from '../../src/workflow/steps';
import { createGithubEvent } from '../fixtures/github-event';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

vi.mock('../../src/helpers/github/events', () => ({
    getEvent: getEventMock,
}));

vi.mock('../../src/workflow/status-comment', () => ({
    upsertStatusComment: vi.fn(),
}));

const STEPS = [
    { id: 'parse-request', name: 'Parse request' },
    { id: 'validate-labels', name: 'Validate labels' },
] as const satisfies readonly StepDefinition[];

describe('steps', () => {
    beforeEach(() => {
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance().seedSteps(STEPS);
        vi.mocked(upsertStatusComment).mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('beginStep', () => {
        it('should mark a seeded step as in-progress and sync the comment', async () => {
            await beginStep('parse-request');

            expect(AppContext.getInstance().steps[0]).toMatchObject({
                id: 'parse-request',
                name: 'Parse request',
                status: 'in-progress',
                startedAt: expect.any(String),
                details: [],
            });
            expect(AppContext.getInstance().steps[1]!.status).toBe(
                StepStatus.PENDING,
            );
            expect(upsertStatusComment).toHaveBeenCalledTimes(1);
        });

        it('should allow overriding the step name', async () => {
            await beginStep('parse-request', 'Override name');

            expect(AppContext.getInstance().steps[0]!.name).toBe(
                'Override name',
            );
        });

        it('should throw when the step does not exist', async () => {
            await expect(beginStep('missing')).rejects.toThrow(
                'Step not found: missing',
            );
            expect(upsertStatusComment).not.toHaveBeenCalled();
        });
    });

    describe('finishStep', () => {
        it('should mark the step as completed and sync the comment', async () => {
            await beginStep('parse-request');
            await beginStep('validate-labels');

            await finishStep('parse-request');

            expect(AppContext.getInstance().steps[0]).toMatchObject({
                id: 'parse-request',
                status: 'completed',
                completedAt: expect.any(String),
            });
            expect(AppContext.getInstance().steps[1]!).toMatchObject({
                id: 'validate-labels',
                status: 'in-progress',
            });
            expect(upsertStatusComment).toHaveBeenCalledTimes(3);
        });

        it('should throw when the step does not exist', async () => {
            await expect(finishStep('missing')).rejects.toThrow(
                'Step not found: missing',
            );
            expect(upsertStatusComment).not.toHaveBeenCalled();
        });
    });

    describe('failStep', () => {
        it('should mark the step as failed with the serialized error', async () => {
            await beginStep('parse-request');
            await beginStep('validate-labels');

            await failStep('parse-request', new Error('boom'));

            expect(AppContext.getInstance().steps[0]).toMatchObject({
                id: 'parse-request',
                status: 'failed',
                completedAt: expect.any(String),
                error: {
                    message: 'boom',
                    stack: expect.stringContaining('boom'),
                },
            });
            expect(AppContext.getInstance().steps[1]!).toMatchObject({
                id: 'validate-labels',
                status: 'in-progress',
            });
            expect(upsertStatusComment).toHaveBeenCalledTimes(3);
        });

        it('should throw when the step does not exist', async () => {
            await expect(
                failStep('missing', new Error('boom')),
            ).rejects.toThrow('Step not found: missing');
            expect(upsertStatusComment).not.toHaveBeenCalled();
        });
    });

    describe('failActiveStep', () => {
        it('should fail the in-progress step', async () => {
            await beginStep('parse-request');

            await failActiveStep(new Error('boom'));

            expect(AppContext.getInstance().steps[0]!.status).toBe('failed');
            expect(upsertStatusComment).toHaveBeenCalledTimes(2);
        });

        it('should do nothing when there is no in-progress step', async () => {
            await failActiveStep(new Error('boom'));

            expect(AppContext.getInstance().steps[0]!.status).toBe(
                StepStatus.PENDING,
            );
            expect(AppContext.getInstance().steps[1]!.status).toBe(
                StepStatus.PENDING,
            );
            expect(upsertStatusComment).not.toHaveBeenCalled();
        });
    });

    describe('cancelPendingSteps', () => {
        it('should cancel pending steps and leave completed steps untouched', async () => {
            await beginStep('parse-request');
            await finishStep('parse-request');

            cancelPendingSteps();

            expect(AppContext.getInstance().steps[0]!.status).toBe(
                StepStatus.COMPLETED,
            );
            expect(AppContext.getInstance().steps[1]).toMatchObject({
                id: 'validate-labels',
                status: 'cancelled',
                completedAt: expect.any(String),
            });
            expect(upsertStatusComment).toHaveBeenCalledTimes(2);
        });
    });

    describe('addStepDetails', () => {
        it('should append a detail line to the step', async () => {
            await beginStep('parse-request');
            await beginStep('validate-labels');

            await addStepDetails('parse-request', 'fetched labels');

            expect(AppContext.getInstance().steps[0]!.details).toEqual([
                'fetched labels',
            ]);
            expect(AppContext.getInstance().steps[1]!.details).toEqual([]);
            expect(upsertStatusComment).toHaveBeenCalledTimes(3);
        });

        it('should throw when the step does not exist', async () => {
            await expect(addStepDetails('missing', 'detail')).rejects.toThrow(
                'Step not found: missing',
            );
            expect(upsertStatusComment).not.toHaveBeenCalled();
        });
    });

    describe('toStepError', () => {
        it('should serialize an error into a step error', () => {
            const result = toStepError(new Error('boom'));

            expect(result.message).toBe('boom');
            expect(result.stack).toContain('Error: boom');
        });

        it('should fall back to unknown message when nothing is serializable', () => {
            const result = toStepError({});

            expect(result.message).toBe('Unknown error');
        });
    });

    describe('createSteps', () => {
        it('should return typed boundary functions bound to the step definitions', async () => {
            const bound = createSteps(STEPS);

            await bound.beginStep('parse-request');
            await bound.finishStep('parse-request');
            await bound.addStepDetails('parse-request', 'detail');

            expect(AppContext.getInstance().steps[0]).toMatchObject({
                status: 'completed',
                details: ['detail'],
            });
            expect(upsertStatusComment).toHaveBeenCalledTimes(3);
        });

        it('should expose a typed failStep that marks the bound step as failed', async () => {
            const bound = createSteps(STEPS);

            await bound.failStep('parse-request', new Error('boom'));

            expect(AppContext.getInstance().steps[0]).toMatchObject({
                status: 'failed',
                error: { message: 'boom' },
            });
            expect(upsertStatusComment).toHaveBeenCalledTimes(1);
        });

        it('should reject unknown steps on every bound function', async () => {
            const bound = createSteps(STEPS) as unknown as {
                beginStep: (id: string, name?: string) => Promise<void>;
                finishStep: (id: string) => Promise<void>;
                failStep: (id: string, error: unknown) => Promise<void>;
                addStepDetails: (id: string, detail: string) => Promise<void>;
            };

            await expect(bound.beginStep('unknown')).rejects.toThrow(
                'Unknown step: unknown',
            );
            await expect(bound.finishStep('unknown')).rejects.toThrow(
                'Unknown step: unknown',
            );
            await expect(
                bound.failStep('unknown', new Error('boom')),
            ).rejects.toThrow('Unknown step: unknown');
            await expect(
                bound.addStepDetails('unknown', 'detail'),
            ).rejects.toThrow('Unknown step: unknown');
            expect(upsertStatusComment).not.toHaveBeenCalled();
        });
    });
});
