import type { Label } from '@octokit/webhooks-types';
import {
    assignIssueToUser,
    closeIssue,
    lockIssue,
} from 'hub-mason-core/github/issues';
import { logger } from 'hub-mason-core/utils/logger';
import { failActiveStep } from 'hub-mason-core/lifecycle/core/bound-steps';
import { LifecycleManager } from 'hub-mason-core/lifecycle/core/manager';

import { AppContext } from '@/src/context/app-context';
import { routeEvent } from '@/src/router';
import type { HandlerContext } from '@/src/types/context';
import {
    postSummaryComment,
    syncStatusComment,
    updateStatus,
} from '@/src/workflow/portal-reporter';

import { createGithubEvent } from '../fixtures/github-event';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

const processExitSpy = vi
    .spyOn(process, 'exit')
    .mockImplementation((() => {}) as never);

vi.mock('hub-mason-core/github/event', () => ({
    getEvent: getEventMock,
}));

vi.mock('@/src/utils/constants', () => ({
    IssueType: {
        PROVISION_REPOSITORY: 'repository/provision-repository',
        DELETE_REPO: 'repo/delete',
    },
    STATUS_LABEL_PREFIX: 'status:',
    StatusLabel: {
        OPENED: { name: 'status:opened' },
        INITIATED: { name: 'status:initiated' },
        FAILED: { name: 'status:failed' },
    },
    StepStatus: {
        PENDING: 'pending',
        IN_PROGRESS: 'in-progress',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
        FAILED: 'failed',
    },
    StepStatusEmoji: {
        pending: '⏳',
        'in-progress': '🔄',
        completed: '✅',
        cancelled: '🚫',
        failed: '❌',
    },
}));

const handle = vi.fn();

vi.mock('@/src/handlers/repository/provision-repository/handler', () => ({
    handle,
}));

vi.mock('hub-mason-core/github/issues', () => ({
    assignIssueToUser: vi.fn(),
    closeIssue: vi.fn(),
    lockIssue: vi.fn(),
}));

vi.mock('hub-mason-core/lifecycle/core/errors', () => ({
    toStepError: vi.fn((error: unknown) => ({
        message: error instanceof Error ? error.message : 'Unknown error',
    })),
}));

vi.mock('@/src/workflow/portal-reporter', () => ({
    createPortalCommentReporter: vi.fn(() => ({ onTransition: vi.fn() })),
    postSummaryComment: vi.fn(),
    syncStatusComment: vi.fn(),
    updateStatus: vi.fn(),
}));

vi.mock('hub-mason-core/lifecycle/core/bound-steps', () => ({
    failActiveStep: vi.fn(),
}));

describe('router tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
        vi.mocked(updateStatus).mockResolvedValue(undefined);
        vi.mocked(syncStatusComment).mockResolvedValue(undefined);
        vi.mocked(lockIssue).mockResolvedValue(undefined);
        vi.mocked(assignIssueToUser).mockResolvedValue(undefined);
        vi.mocked(closeIssue).mockResolvedValue(undefined);
        vi.mocked(failActiveStep).mockResolvedValue(undefined);
        vi.mocked(postSummaryComment).mockResolvedValue(undefined);
        handle.mockResolvedValue(undefined);
        vi.spyOn(LifecycleManager.prototype, 'cancelPending').mockReturnValue(
            undefined,
        );
    });

    it('should set the opened status before locking, then initiated status after validation checks', async () => {
        const event = createGithubEvent();

        await routeEvent(event);

        expect(updateStatus).toHaveBeenNthCalledWith(1, 1, {
            name: 'status:opened',
        });
        expect(lockIssue).toHaveBeenCalledWith(
            { issueNumber: 1 },
            { owner: 'john-doe', repo: 'test-repo' },
        );
        expect(assignIssueToUser).toHaveBeenCalledWith(
            {
                issueNumber: 1,
                assignee: ['john-doe'],
            },
            { owner: 'john-doe', repo: 'test-repo' },
        );
        expect(updateStatus).toHaveBeenNthCalledWith(2, 1, {
            name: 'status:initiated',
        });
        expect(AppContext.getInstance().store.get()).toEqual([
            {
                id: 'verify-issue',
                name: 'Verify issue',
                status: 'pending',
                details: [],
            },
            {
                id: 'provision-repository-request-checks',
                name: 'Provision repository request checks',
                status: 'pending',
                details: [],
            },
            {
                id: 'provision-repository',
                name: 'Provision repository',
                status: 'pending',
                details: [],
            },
        ]);
        expect(syncStatusComment).toHaveBeenCalledTimes(1);
    });

    it('should log an error when there are multiple requests in the issue labels', async () => {
        const event = {
            ...createGithubEvent(),
            issue: {
                ...createGithubEvent().issue,
                labels: [
                    { name: 'repository/provision-repository' },
                    { name: 'repo/delete' },
                ] as unknown as Label[],
            },
        };

        await routeEvent(event);

        expect(logger.error).toHaveBeenCalledWith(
            'Multiple request in given issue: repository/provision-repository,repo/delete',
        );
        expect(handle).not.toHaveBeenCalled();
        expect(AppContext.getInstance().store.get()).toEqual([]);
        expect(updateStatus).toHaveBeenCalledWith(1, {
            name: 'status:failed',
        });
        expect(syncStatusComment).not.toHaveBeenCalled();
        expect(closeIssue).toHaveBeenCalledWith(
            { issueNumber: 1 },
            { owner: 'john-doe', repo: 'test-repo' },
        );
        expect(postSummaryComment).toHaveBeenCalled();
    });

    it('should fail the run when no known request label is present', async () => {
        const event = {
            ...createGithubEvent(),
            issue: { ...createGithubEvent().issue, labels: [] },
        } as unknown as Parameters<typeof routeEvent>[0];

        await routeEvent(event);

        expect(handle).not.toHaveBeenCalled();
        expect(updateStatus).toHaveBeenCalledWith(1, {
            name: 'status:failed',
        });
        expect(AppContext.getInstance().runError).toEqual({
            message: 'No request found in given issue',
        });
        expect(closeIssue).toHaveBeenCalledWith(
            { issueNumber: 1 },
            { owner: 'john-doe', repo: 'test-repo' },
        );
        expect(postSummaryComment).toHaveBeenCalled();
    });

    it('should call handler for given request with the lifecycle context', async () => {
        const event = createGithubEvent();

        await routeEvent(event);

        expect(logger.info).toHaveBeenCalledWith(
            '[repository/provision-repository]',
        );
        expect(handle).toHaveBeenCalledWith(
            event,
            expect.objectContaining({ lifecycle: expect.anything() }),
        );
        const context = vi.mocked(handle).mock.calls[0]![1] as HandlerContext;

        expect(context.lifecycle.steps).toHaveLength(3);
    });

    it('should fail the active step, cancel remaining and sync the comment when the handler fails', async () => {
        const event = createGithubEvent();
        const error = new Error('handler failed');
        handle.mockRejectedValue(error);

        await routeEvent(event);

        expect(failActiveStep).toHaveBeenCalledWith(
            expect.objectContaining({
                manager: expect.anything(),
                running: 'in-progress',
                failed: 'failed',
                error,
            }),
        );
        expect(
            vi.mocked(LifecycleManager.prototype.cancelPending),
        ).toHaveBeenCalled();
        expect(updateStatus).toHaveBeenCalledWith(1, {
            name: 'status:failed',
        });
        expect(syncStatusComment).toHaveBeenCalledTimes(2);
        expect(AppContext.getInstance().runError).toEqual({
            message: 'handler failed',
        });
        expect(postSummaryComment).toHaveBeenCalled();
    });

    it('should close the issue and post the summary when the handler fails and exit the process with status 1', async () => {
        const event = createGithubEvent();
        handle.mockRejectedValue(new Error('handler failed'));

        await routeEvent(event);

        expect(closeIssue).toHaveBeenCalledWith(
            { issueNumber: 1 },
            { owner: 'john-doe', repo: 'test-repo' },
        );
        expect(postSummaryComment).toHaveBeenCalled();
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should leave close and summary to workflow when the handler succeeds', async () => {
        const event = createGithubEvent();

        await routeEvent(event);

        expect(closeIssue).not.toHaveBeenCalled();
        expect(postSummaryComment).not.toHaveBeenCalled();
        expect(processExitSpy).not.toHaveBeenCalled();
    });

    it('should still post the summary when closing the issue fails', async () => {
        const event = createGithubEvent();
        handle.mockRejectedValue(new Error('handler failed'));
        vi.mocked(closeIssue).mockRejectedValueOnce(new Error('close failed'));

        await routeEvent(event);

        expect(closeIssue).toHaveBeenCalledWith(
            { issueNumber: 1 },
            { owner: 'john-doe', repo: 'test-repo' },
        );
        expect(postSummaryComment).toHaveBeenCalled();
    });

    it('should report the error when locking the issue fails', async () => {
        const event = createGithubEvent();
        const error = new Error('lock failed');
        vi.mocked(lockIssue).mockRejectedValueOnce(error);

        await routeEvent(event);

        expect(failActiveStep).not.toHaveBeenCalled();
        expect(updateStatus).toHaveBeenCalledWith(1, {
            name: 'status:failed',
        });
        expect(syncStatusComment).not.toHaveBeenCalled();
        expect(AppContext.getInstance().runError).toEqual({
            message: 'lock failed',
        });
        expect(postSummaryComment).toHaveBeenCalled();
    });

    it('should report the error when assigning the issue fails', async () => {
        const event = createGithubEvent();
        const error = new Error('assign failed');
        vi.mocked(assignIssueToUser).mockRejectedValueOnce(error);

        await routeEvent(event);

        expect(failActiveStep).not.toHaveBeenCalled();
        expect(updateStatus).toHaveBeenCalledWith(1, {
            name: 'status:failed',
        });
        expect(syncStatusComment).not.toHaveBeenCalled();
        expect(AppContext.getInstance().runError).toEqual({
            message: 'assign failed',
        });
        expect(postSummaryComment).toHaveBeenCalled();
    });

    it('should log when marking the active step failed fails', async () => {
        const event = createGithubEvent();
        handle.mockRejectedValue(new Error('handler failed'));
        vi.mocked(failActiveStep).mockRejectedValueOnce(
            new Error('step failed'),
        );

        await routeEvent(event);

        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                err: expect.objectContaining({ message: 'step failed' }),
            }),
            'Failed to mark active step as failed on issue #1',
        );
    });

    it('should log when reporting the error on the issue fails', async () => {
        const event = createGithubEvent();
        handle.mockRejectedValue(new Error('handler failed'));
        vi.mocked(syncStatusComment)
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(new Error('comment failed'));

        await routeEvent(event);

        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                err: expect.objectContaining({ message: 'comment failed' }),
            }),
            'Failed to report error on issue #1',
        );
    });

    it('should log when posting the summary comment fails', async () => {
        const event = createGithubEvent();
        handle.mockRejectedValue(new Error('handler failed'));
        vi.mocked(postSummaryComment).mockRejectedValueOnce(
            new Error('summary failed'),
        );

        await routeEvent(event);

        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                err: expect.objectContaining({ message: 'summary failed' }),
            }),
            'Failed to post summary comment on issue #1',
        );
    });
});
