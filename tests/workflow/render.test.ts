import { AppContext } from '@/src/context/app-context';
import type { Step } from '@/src/types/step';
import { StepStatus } from '@/src/utils/constants';
import { renderStatusComment, renderSummary } from '@/src/workflow/render';
import { createGithubEvent } from '../fixtures/github-event';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

vi.mock('@/src/helpers/github/events', () => ({
    getEvent: getEventMock,
}));

const createStep = (overrides: Partial<Step> = {}): Step => ({
    id: 'step-1',
    name: 'Step one',
    status: StepStatus.IN_PROGRESS,
    startedAt: '2026-01-01T00:00:00.000Z',
    details: [],
    ...overrides,
});

describe('renderStatusComment', () => {
    let context: AppContext;

    beforeEach(() => {
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        context = AppContext.getInstance();
        context.setRequest({
            type: 'repository/provision-repository',
            requestId: 'R-1',
            payload: {},
        });
    });

    it('should render header with request type and request id', () => {
        const body = renderStatusComment(context);

        expect(body).toContain('## repository/provision-repository');
        expect(body).toContain('Request-Id: `R-1`');
    });

    it('should render header with fallbacks when request is not set', () => {
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        context = AppContext.getInstance();

        const body = renderStatusComment(context);

        expect(body).toContain('## request');
        expect(body).toContain('Request-Id: `-`');
    });

    it('should render the steps table with a header row', () => {
        context.setSteps([createStep()]);

        const body = renderStatusComment(context);

        expect(body).toContain('| Step | Status | Details |');
    });

    it('should render pending steps with the pending emoji', () => {
        context.setSteps([createStep({ status: StepStatus.PENDING })]);

        const body = renderStatusComment(context);

        expect(body).toContain('| Step one | ⏳ pending | - |');
    });

    it('should render in-progress steps with the in-progress emoji', () => {
        context.setSteps([createStep()]);

        const body = renderStatusComment(context);

        expect(body).toContain('| Step one | 🔄 in-progress | - |');
    });

    it('should render completed steps with the completed emoji', () => {
        context.setSteps([createStep({ status: StepStatus.COMPLETED })]);

        const body = renderStatusComment(context);

        expect(body).toContain('| Step one | ✅ completed | - |');
    });

    it('should render failed steps with the failed emoji', () => {
        context.setSteps([createStep({ status: StepStatus.FAILED })]);

        const body = renderStatusComment(context);

        expect(body).toContain('| Step one | ❌ failed | - |');
    });

    it('should render cancelled steps with the cancelled emoji', () => {
        context.setSteps([createStep({ status: StepStatus.CANCELLED })]);

        const body = renderStatusComment(context);

        expect(body).toContain('| Step one | 🚫 cancelled | - |');
    });

    it('should render step details joined in the details column', () => {
        context.setSteps([
            createStep({
                status: StepStatus.COMPLETED,
                details: ['Template matched', 'Payload validated'],
            }),
        ]);

        const body = renderStatusComment(context);

        expect(body).toContain(
            '| Step one | ✅ completed | Template matched, Payload validated |',
        );
    });

    it('should render the error section with the failed step message and stack', () => {
        context.setSteps([
            createStep({
                status: StepStatus.FAILED,
                error: {
                    message: 'boom',
                    stack: 'Error: boom\n    at fn',
                },
            }),
        ]);

        const body = renderStatusComment(context);

        expect(body).toContain('### Error');
        expect(body).toContain('Failed at step: **Step one**');
        expect(body).toContain('> boom');
        expect(body).toContain('```');
        expect(body).toContain('Error: boom\n    at fn');
    });

    it('should render failed step without stack as message only', () => {
        context.setSteps([
            createStep({
                status: StepStatus.FAILED,
                error: { message: 'boom' },
            }),
        ]);

        const body = renderStatusComment(context);

        expect(body).toContain('> boom');
        expect(body).not.toContain('```');
    });

    it('should render run error when there are no failed steps', () => {
        context.setRunError({
            message: 'run failed',
            stack: 'Error: run failed\n    at init',
        });

        const body = renderStatusComment(context);

        expect(body).toContain('### Error');
        expect(body).toContain('> run failed');
        expect(body).toContain('Error: run failed\n    at init');
    });

    it('should render run error without stack as message only', () => {
        context.setRunError({ message: 'run failed' });

        const body = renderStatusComment(context);

        expect(body).toContain('### Error');
        expect(body).toContain('> run failed');
        expect(body).not.toContain('```');
    });

    it('should prefer failed step details over the run error', () => {
        context.setSteps([
            createStep({
                status: StepStatus.FAILED,
                error: { message: 'step boom' },
            }),
        ]);
        context.setRunError({ message: 'run boom' });

        const body = renderStatusComment(context);

        expect(body).toContain('Failed at step: **Step one**');
        expect(body).toContain('> step boom');
        expect(body).not.toContain('> run boom');
    });

    it('should not render an error section when everything succeeded', () => {
        context.setSteps([createStep({ status: StepStatus.COMPLETED })]);

        const body = renderStatusComment(context);

        expect(body).not.toContain('### Error');
    });
});

describe('renderSummary', () => {
    let context: AppContext;

    beforeEach(() => {
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        context = AppContext.getInstance();
        context.setRequest({
            type: 'repository/provision-repository',
            requestId: 'R-1',
            payload: {},
        });
    });

    it('should render request type, id and completed status when nothing failed', () => {
        context.setSteps([createStep({ status: StepStatus.COMPLETED })]);

        const body = renderSummary(context);

        expect(body).toContain('## Summary');
        expect(body).toContain(
            'Request type: **repository/provision-repository**',
        );
        expect(body).toContain('Request-Id: `R-1`');
        expect(body).toContain('Status: **COMPLETED**');
        expect(body).not.toContain('### Error');
    });

    it('should render completed status when a cancelled step remains', () => {
        context.setSteps([createStep({ status: StepStatus.CANCELLED })]);

        const body = renderSummary(context);

        expect(body).toContain('Status: **COMPLETED**');
    });

    it('should render failed status with the failed step error', () => {
        context.setSteps([
            createStep({
                status: StepStatus.FAILED,
                error: { message: 'step boom', stack: 'Error: step boom' },
            }),
        ]);

        const body = renderSummary(context);

        expect(body).toContain('Status: **FAILED**');
        expect(body).toContain('### Error');
        expect(body).toContain('> step boom');
        expect(body).toContain('Error: step boom');
    });

    it('should render failed status with the run error when no step failed', () => {
        context.setRunError({ message: 'run boom' });

        const body = renderSummary(context);

        expect(body).toContain('Status: **FAILED**');
        expect(body).toContain('> run boom');
    });

    it('should fall back to unknown error when no error detail exists', () => {
        context.setSteps([createStep({ status: StepStatus.FAILED })]);

        const body = renderSummary(context);

        expect(body).toContain('> Unknown error');
    });

    it('should render fallbacks when the request is not set', () => {
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        context = AppContext.getInstance();

        const body = renderSummary(context);

        expect(body).toContain('Request type: **unknown**');
        expect(body).toContain('Request-Id: `-`');
        expect(body).toContain('Status: **COMPLETED**');
    });
});
