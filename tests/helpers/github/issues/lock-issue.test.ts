import { AppContext } from '@/src/context/app-context';
import { lockIssue } from '@/src/helpers/github/issues/lock-issue';
import { logger } from '@/src/utils/logger';
import { createGithubEvent } from '../../../fixtures/github-event';
import { mockOctokitClient } from '@/tests/fixtures/octokit-client';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

vi.mock('@/src/helpers/github/events', () => ({
    getEvent: getEventMock,
}));

const lockMock = vi.fn();

mockOctokitClient({ issues: { lock: lockMock } });

describe('lockIssue tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
        lockMock.mockResolvedValue({ status: 204 });
    });

    it('should lock the issue successfully', async () => {
        await lockIssue({ issueNumber: 10 });

        expect(logger.info).toHaveBeenCalledWith(
            'Locking issue: john-doe/test-repo#10',
        );

        expect(lockMock).toHaveBeenCalledWith({
            repo: 'test-repo',
            issue_number: 10,
            owner: 'john-doe',
            lock_reason: 'resolved',
        });

        expect(logger.info).toHaveBeenCalledWith(
            'Locked issue: john-doe/test-repo#10',
        );
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('should lock the issue with lock reason', async () => {
        await lockIssue({ issueNumber: 10, lockReason: 'resolved' });

        expect(lockMock).toHaveBeenCalledWith({
            repo: 'test-repo',
            issue_number: 10,
            owner: 'john-doe',
            lock_reason: 'resolved',
        });
    });

    it('should throw error if failed to lock the issue', async () => {
        const error = new Error('Network issue');

        lockMock.mockRejectedValue(error);

        await expect(lockIssue({ issueNumber: 10 })).rejects.toThrow(
            error.message,
        );

        expect(logger.info).toHaveBeenCalledWith(
            'Locking issue: john-doe/test-repo#10',
        );

        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                err: expect.objectContaining({ message: 'Network issue' }),
            }),
            'Failed to lock issue: john-doe/test-repo#10',
        );
    });
});
