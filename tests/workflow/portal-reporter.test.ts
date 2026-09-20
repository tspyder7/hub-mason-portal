import {
    createGithubCommentReporter,
    postSummaryComment as postSummaryCommentCore,
} from 'hub-mason-core/adapters/github/comment-reporter';
import { createGithubLabelReporter } from 'hub-mason-core/adapters/github/label-reporter';
import { LifecycleManager } from 'hub-mason-core/lifecycle/core/manager';

import { AppContext } from '@/src/context/app-context';
import { StepStatus } from '@/src/utils/constants';
import { portalLifecycleConfig } from '@/src/workflow/portal-config';
import {
    createPortalCommentReporter,
    postSummaryComment,
    syncStatusComment,
    updateStatus,
    workflowMeta,
} from '@/src/workflow/portal-reporter';

import { createGithubEvent } from '../fixtures/github-event';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

const { onTransitionMock, postSummaryCoreMock, updateStatusMock } = vi.hoisted(
    () => ({
        onTransitionMock: vi.fn(),
        postSummaryCoreMock: vi.fn(),
        updateStatusMock: vi.fn(),
    }),
);

vi.mock('hub-mason-core/github/event', () => ({
    getEvent: getEventMock,
}));

vi.mock('hub-mason-core/adapters/github/comment-reporter', () => ({
    createGithubCommentReporter: vi.fn(() => ({
        onTransition: onTransitionMock,
    })),
    postSummaryComment: postSummaryCoreMock,
}));

vi.mock('hub-mason-core/adapters/github/label-reporter', () => ({
    createGithubLabelReporter: vi.fn(() => ({
        updateStatus: updateStatusMock,
    })),
}));

const STEPS = [
    { id: 'parse-request', name: 'Parse request' },
    { id: 'validate-labels', name: 'Validate labels' },
] as const;

const createManager = (): LifecycleManager<StepStatus> =>
    new LifecycleManager<StepStatus>({
        definitions: [...STEPS],
        config: portalLifecycleConfig,
        store: AppContext.getInstance().store,
        reporter: createPortalCommentReporter(),
    });

describe('portal-reporter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
        onTransitionMock.mockResolvedValue(undefined);
        postSummaryCoreMock.mockResolvedValue(undefined);
        updateStatusMock.mockResolvedValue(undefined);
    });

    describe('workflowMeta', () => {
        it('should read the request metadata when a request is set', () => {
            AppContext.getInstance().setRequest({
                type: 'repository/provision-repository',
                requestId: 'R-9',
                payload: {},
            });

            expect(workflowMeta(AppContext.getInstance())).toEqual({
                requestType: 'repository/provision-repository',
                requestId: 'R-9',
                owner: 'john-doe',
                repo: 'test-repo',
                runId: 123,
            });
        });

        it('should fall back to the github request id when no request is set', () => {
            expect(workflowMeta(AppContext.getInstance())).toEqual({
                requestType: undefined,
                requestId: 'R-1',
                owner: 'john-doe',
                repo: 'test-repo',
                runId: 123,
            });
        });
    });

    describe('createPortalCommentReporter', () => {
        it('should delegate transitions to the core reporter with live context', async () => {
            AppContext.getInstance().setRequest({
                type: 'repository/provision-repository',
                requestId: 'R-1',
                payload: {},
            });
            AppContext.getInstance().setStatusCommentId(7);
            AppContext.getInstance().setRunError({ message: 'boom' });

            const manager = createManager();
            const step = manager.steps[0]!;

            await createPortalCommentReporter().onTransition?.({
                step,
                from: StepStatus.PENDING,
                to: StepStatus.IN_PROGRESS,
                all: manager.steps,
            });

            expect(createGithubCommentReporter).toHaveBeenCalledWith(
                expect.objectContaining({
                    repository: { owner: 'john-doe', repo: 'test-repo' },
                    issueNumber: 1,
                    meta: expect.objectContaining({ requestId: 'R-1' }),
                    runError: { message: 'boom' },
                }),
            );
            expect(onTransitionMock).toHaveBeenCalledWith({
                step,
                from: StepStatus.PENDING,
                to: StepStatus.IN_PROGRESS,
                all: manager.steps,
            });
        });

        it('should wire the stored comment id through the reporter accessors', async () => {
            const manager = createManager();

            await createPortalCommentReporter().onTransition?.({
                step: manager.steps[0]!,
                from: StepStatus.PENDING,
                to: StepStatus.PENDING,
                all: manager.steps,
            });

            const input = vi.mocked(createGithubCommentReporter).mock
                .calls[0]![0];

            expect(input.getCommentId?.()).toBeUndefined();

            input.setCommentId?.(42);

            expect(AppContext.getInstance().statusCommentId).toBe(42);
            expect(input.getCommentId?.()).toBe(42);
        });

        it('should filter only failed steps for the reporter', async () => {
            const manager = createManager();

            await createPortalCommentReporter().onTransition?.({
                step: manager.steps[0]!,
                from: StepStatus.PENDING,
                to: StepStatus.PENDING,
                all: manager.steps,
            });

            const input = vi.mocked(createGithubCommentReporter).mock
                .calls[0]![0];

            expect(input.failedStatusFilter?.(StepStatus.FAILED)).toBe(true);
            expect(input.failedStatusFilter?.(StepStatus.COMPLETED)).toBe(
                false,
            );
        });

        it('should resolve when the core reporter has no transition handler', async () => {
            vi.mocked(createGithubCommentReporter).mockReturnValueOnce(
                {} as never,
            );
            const manager = createManager();

            await expect(
                createPortalCommentReporter().onTransition?.({
                    step: manager.steps[0]!,
                    from: StepStatus.PENDING,
                    to: StepStatus.PENDING,
                    all: manager.steps,
                }),
            ).resolves.toBeUndefined();
        });
    });

    describe('syncStatusComment', () => {
        it('should sync the last step as a self-transition', async () => {
            const manager = createManager();

            await manager.transition('parse-request', StepStatus.IN_PROGRESS);
            vi.clearAllMocks();

            await syncStatusComment(manager);

            expect(onTransitionMock).toHaveBeenCalledWith({
                step: expect.objectContaining({
                    id: 'validate-labels',
                    status: StepStatus.PENDING,
                }),
                from: StepStatus.PENDING,
                to: StepStatus.PENDING,
                all: manager.steps,
            });
        });

        it('should skip the reporter when there are no steps', async () => {
            const manager = createManager();
            AppContext.getInstance().store.set(() => []);

            await syncStatusComment(manager);

            expect(createGithubCommentReporter).not.toHaveBeenCalled();
            expect(onTransitionMock).not.toHaveBeenCalled();
        });
    });

    describe('postSummaryComment', () => {
        it('should post the summary through the core reporter', async () => {
            AppContext.getInstance().setRequest({
                type: 'repository/provision-repository',
                requestId: 'R-1',
                payload: {},
            });
            createManager();

            await postSummaryComment();

            expect(postSummaryCommentCore).toHaveBeenCalledWith(
                expect.objectContaining({
                    repository: { owner: 'john-doe', repo: 'test-repo' },
                    issueNumber: 1,
                    steps: AppContext.getInstance().store.get(),
                    meta: expect.objectContaining({ requestId: 'R-1' }),
                }),
            );
        });

        it('should filter only failed steps for the summary', async () => {
            createManager();

            await postSummaryComment();

            const input = vi.mocked(postSummaryCommentCore).mock.calls[0]![0];

            expect(input.failedStatusFilter?.(StepStatus.FAILED)).toBe(true);
            expect(input.failedStatusFilter?.(StepStatus.COMPLETED)).toBe(
                false,
            );
        });
    });

    describe('updateStatus', () => {
        it('should update the status label through the core reporter', async () => {
            const label = { name: 'status:in-progress' } as never;

            await updateStatus(1, label);

            expect(createGithubLabelReporter).toHaveBeenCalledWith({
                repository: { owner: 'john-doe', repo: 'test-repo' },
                issueNumber: 1,
                labelPrefix: 'status:',
            });
            expect(updateStatusMock).toHaveBeenCalledWith(label);
        });
    });
});
