import { createGithubCommentReporter } from 'hub-mason-core/adapters/github/comment-reporter';

import { AppContext } from '@/src/context/app-context';
import {
    createLifecycle,
    createSteps,
} from '@/src/handlers/repository/provision-repository/lifecycle';
import { Step } from '@/src/handlers/repository/provision-repository/steps';
import { StepStatus } from '@/src/utils/constants';

import { createGithubEvent } from '../../../fixtures/github-event';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));
const { onTransitionMock } = vi.hoisted(() => ({
    onTransitionMock: vi.fn(),
}));

vi.mock('hub-mason-core/github/event', () => ({
    getEvent: getEventMock,
}));

vi.mock('hub-mason-core/adapters/github/comment-reporter', () => ({
    createGithubCommentReporter: vi.fn(() => ({
        onTransition: onTransitionMock,
    })),
    postSummaryComment: vi.fn(),
}));

describe('provision-repository lifecycle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
        onTransitionMock.mockResolvedValue(undefined);
    });

    it('should seed the provision steps as pending in the app store', () => {
        const lifecycle = createLifecycle();

        expect(lifecycle.steps.map(({ id }) => id)).toEqual([
            Step.VERIFY_ISSUE,
            Step.VALIDATE_REQUEST,
            Step.PROVISION_REPOSITORY,
        ]);
        expect(
            lifecycle.steps.every(
                ({ status }) => status === StepStatus.PENDING,
            ),
        ).toBe(true);
        expect(AppContext.getInstance().store.get()).toHaveLength(3);
    });

    it('should report transitions through the portal comment reporter', async () => {
        const lifecycle = createLifecycle();

        await lifecycle.transition(Step.VERIFY_ISSUE, StepStatus.IN_PROGRESS);

        expect(createGithubCommentReporter).toHaveBeenCalledWith(
            expect.objectContaining({
                repository: { owner: 'john-doe', repo: 'test-repo' },
                issueNumber: 1,
            }),
        );
        expect(onTransitionMock).toHaveBeenCalled();
    });

    it('should expose bound steps for the provision definitions', async () => {
        const lifecycle = createLifecycle();
        const steps = createSteps(lifecycle);

        await steps.beginStep(Step.VERIFY_ISSUE);
        await steps.finishStep(Step.VERIFY_ISSUE);
        await steps.addStepDetails(Step.VERIFY_ISSUE, 'ok');

        expect(
            lifecycle.steps.find(({ id }) => id === Step.VERIFY_ISSUE),
        ).toMatchObject({
            status: StepStatus.COMPLETED,
            details: ['ok'],
        });
    });

    it('should reject steps outside the provision definitions', async () => {
        const lifecycle = createLifecycle();
        const steps = createSteps(lifecycle) as unknown as {
            beginStep: (id: string) => Promise<void>;
        };

        await expect(steps.beginStep('unknown')).rejects.toThrow(
            'Unknown step: unknown',
        );
    });
});
