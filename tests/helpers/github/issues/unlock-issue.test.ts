import { AppContext } from '@/src/context/app-context';
import { unlockIssue } from '@/src/helpers/github/issues/unlock-issue';
import { logger } from '@/src/utils/logger';
import { createGithubEvent } from '../../../fixtures/github-event';
import { mockOctokitClient } from '@/tests/fixtures/octokit-client';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

vi.mock('@/src/helpers/github/events', () => ({
    getEvent: getEventMock,
}));

const unlockMock = vi.fn();

mockOctokitClient({ issues: { unlock: unlockMock } });

describe('unlockIssue tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
        unlockMock.mockResolvedValue({ status: 204 });
    });

    it('should unlock the issue successfully', async () => {
        await unlockIssue({ issueNumber: 10 });

        expect(logger.info).toHaveBeenCalledWith(
            'Unlocking issue: john-doe/test-repo#10',
        );

        expect(unlockMock).toHaveBeenCalledWith({
            repo: 'test-repo',
            issue_number: 10,
            owner: 'john-doe',
        });

        expect(logger.info).toHaveBeenCalledWith(
            'Unlocked issue: john-doe/test-repo#10',
        );
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('should throw error if failed to unlock the issue', async () => {
        const error = new Error('Network issue');

        unlockMock.mockRejectedValue(error);

        await expect(unlockIssue({ issueNumber: 10 })).rejects.toThrow(
            error.message,
        );

        expect(logger.info).toHaveBeenCalledWith(
            'Unlocking issue: john-doe/test-repo#10',
        );

        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                err: expect.objectContaining({ message: 'Network issue' }),
            }),
            'Failed to unlock issue: john-doe/test-repo#10',
        );
    });
});
