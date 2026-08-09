import { AppContext } from '@/src/context/app-context';
import { assignIssueToUser } from '@/src/helpers/github/issues';
import { logger } from '@/src/utils/logger';
import { createGithubEvent } from '../../../fixtures/github-event';
import { mockOctokitClient } from '@/tests/fixtures/octokit-client';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

vi.mock('@/src/helpers/github/events', () => ({
    getEvent: getEventMock,
}));

const addAssigneesMock = vi.fn();

mockOctokitClient({ issues: { addAssignees: addAssigneesMock } });

describe('assignIssueToUser tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
        addAssigneesMock.mockResolvedValue({});
    });

    afterAll(() => {
        vi.resetAllMocks();
    });

    it('should assign the issue to the given users', async () => {
        await assignIssueToUser({
            issueNumber: 42,
            assignee: ['john-doe', 'jane-doe'],
        });

        expect(addAssigneesMock).toHaveBeenCalledWith({
            issue_number: 42,
            assignees: ['john-doe', 'jane-doe'],
            owner: 'john-doe',
            repo: 'test-repo',
        });
        expect(logger.info).toHaveBeenCalledWith(
            'Assigned issue to: john-doe, jane-doe - john-doe/test-repo#42',
        );
    });

    it('should throw error if failed to assign the issue', async () => {
        addAssigneesMock.mockRejectedValueOnce(new Error('Network error'));

        await expect(
            assignIssueToUser({ issueNumber: 42, assignee: ['john-doe'] }),
        ).rejects.toThrow('Network error');

        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                err: expect.objectContaining({ message: 'Network error' }),
            }),
            'Failed to assign issue to: john-doe - john-doe/test-repo#42',
        );
    });
});
