import type { Label } from '@octokit/webhooks-types';
import { AppContext } from '@/src/context/app-context';
import {
    assignIssueToUser,
    closeIssue,
    lockIssue,
} from '@/src/helpers/github/issues';
import { routeEvent } from '@/src/router';
import { logger } from '@/src/utils/logger';
import { postSummaryComment } from '@/src/workflow/summary-comment';
import { upsertStatusComment } from '@/src/workflow/status-comment';
import { updateStatus } from '@/src/workflow/status-label';
import { cancelPendingSteps, failActiveStep } from '@/src/workflow/steps';
import { createGithubEvent } from '../fixtures/github-event';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

const processExitSpy = vi
    .spyOn(process, 'exit')
    .mockImplementation((() => {}) as never);

vi.mock('@/src/helpers/github/events', () => ({
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
}));

const handle = vi.fn();

vi.mock('@/src/handlers/repository/provision-repository/handler', () => ({
    handle,
}));

vi.mock('@/src/helpers/github/issues', () => ({
    assignIssueToUser: vi.fn(),
    closeIssue: vi.fn(),
    lockIssue: vi.fn(),
}));

vi.mock('@/src/workflow/status-comment', () => ({
    upsertStatusComment: vi.fn(),
}));

vi.mock('@/src/workflow/status-label', () => ({
    updateStatus: vi.fn(),
}));

vi.mock('@/src/workflow/steps', () => ({
    cancelPendingSteps: vi.fn(),
    failActiveStep: vi.fn(),
    toStepError: vi.fn((error: unknown) => ({
        message: error instanceof Error ? error.message : 'Unknown error',
    })),
}));

vi.mock('@/src/workflow/summary-comment', () => ({
    postSummaryComment: vi.fn(),
}));

describe('router tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
        vi.mocked(updateStatus).mockResolvedValue(undefined);
        vi.mocked(upsertStatusComment).mockResolvedValue(undefined);
        vi.mocked(lockIssue).mockResolvedValue(undefined);
        vi.mocked(assignIssueToUser).mockResolvedValue(undefined);
        vi.mocked(closeIssue).mockResolvedValue(undefined);
        vi.mocked(failActiveStep).mockResolvedValue(undefined);
        vi.mocked(cancelPendingSteps).mockReturnValue(undefined);
        vi.mocked(postSummaryComment).mockResolvedValue(undefined);
        handle.mockResolvedValue(undefined);
    });

    it('should set the opened status before locking, then initiated status after validation checks', async () => {
        const event = createGithubEvent();

        await routeEvent(event);

        expect(updateStatus).toHaveBeenNthCalledWith(1, 1, {
            name: 'status:opened',
        });
        expect(lockIssue).toHaveBeenCalledWith({ issueNumber: 1 });
        expect(assignIssueToUser).toHaveBeenCalledWith({
            issueNumber: 1,
            assignee: ['john-doe'],
        });
        expect(updateStatus).toHaveBeenNthCalledWith(2, 1, {
            name: 'status:initiated',
        });
        expect(AppContext.getInstance().steps).toEqual([
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
        expect(upsertStatusComment).toHaveBeenCalledTimes(1);
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
        expect(AppContext.getInstance().steps).toEqual([]);
        expect(updateStatus).toHaveBeenCalledWith(1, {
            name: 'status:failed',
        });
        expect(upsertStatusComment).toHaveBeenCalledTimes(1);
        expect(closeIssue).toHaveBeenCalledWith({ issueNumber: 1 });
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
        expect(closeIssue).toHaveBeenCalledWith({ issueNumber: 1 });
        expect(postSummaryComment).toHaveBeenCalled();
    });

    it('should call handler for given request', async () => {
        const event = createGithubEvent();

        await routeEvent(event);

        expect(logger.info).toHaveBeenCalledWith(
            '[repository/provision-repository]',
        );
        expect(handle).toHaveBeenCalledWith(event);
    });

    it('should fail the active step, cancel remaining and sync the comment when the handler fails', async () => {
        const event = createGithubEvent();
        const error = new Error('handler failed');
        handle.mockRejectedValue(error);

        await routeEvent(event);

        expect(failActiveStep).toHaveBeenCalledWith(error);
        expect(cancelPendingSteps).toHaveBeenCalled();
        expect(updateStatus).toHaveBeenCalledWith(1, {
            name: 'status:failed',
        });
        expect(upsertStatusComment).toHaveBeenCalledTimes(2);
        expect(AppContext.getInstance().runError).toEqual({
            message: 'handler failed',
        });
        expect(postSummaryComment).toHaveBeenCalled();
    });

    it('should close the issue and post the summary when the handler fails and exit the process with status 1', async () => {
        const event = createGithubEvent();
        handle.mockRejectedValue(new Error('handler failed'));

        await routeEvent(event);

        expect(closeIssue).toHaveBeenCalledWith({ issueNumber: 1 });
        expect(postSummaryComment).toHaveBeenCalled();
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should close the issue and post the summary when the handler succeeds', async () => {
        const event = createGithubEvent();

        await routeEvent(event);

        expect(closeIssue).toHaveBeenCalledWith({ issueNumber: 1 });
        expect(postSummaryComment).toHaveBeenCalled();
    });

    it('should report the error when locking the issue fails', async () => {
        const event = createGithubEvent();
        const error = new Error('lock failed');
        vi.mocked(lockIssue).mockRejectedValueOnce(error);

        await routeEvent(event);

        expect(failActiveStep).toHaveBeenCalledWith(error);
        expect(updateStatus).toHaveBeenCalledWith(1, {
            name: 'status:failed',
        });
        expect(upsertStatusComment).toHaveBeenCalledTimes(1);
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

        expect(failActiveStep).toHaveBeenCalledWith(error);
        expect(updateStatus).toHaveBeenCalledWith(1, {
            name: 'status:failed',
        });
        expect(upsertStatusComment).toHaveBeenCalledTimes(1);
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
        vi.mocked(upsertStatusComment)
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
