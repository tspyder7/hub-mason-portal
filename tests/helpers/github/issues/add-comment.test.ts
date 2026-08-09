import { AppContext } from '@/src/context/app-context';
import { addCommentToIssue } from '@/src/helpers/github/issues';
import { logger } from '@/src/utils/logger';
import { createGithubEvent } from '../../../fixtures/github-event';
import { mockOctokitClient } from '@/tests/fixtures/octokit-client';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

vi.mock('@/src/helpers/github/events', () => ({
    getEvent: getEventMock,
}));

const createCommentMock = vi.fn();

mockOctokitClient({ issues: { createComment: createCommentMock } });

describe('addCommentToIssue tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
        createCommentMock.mockResolvedValue({ data: { id: 123 } });
    });

    afterAll(() => {
        vi.resetAllMocks();
    });

    it('should post comment to the issue and return the comment id', async () => {
        const commentId = await addCommentToIssue({
            issueNumber: 42,
            comment: 'Hello world',
        });

        expect(createCommentMock).toHaveBeenCalledWith({
            issue_number: 42,
            body: 'Hello world',
            owner: 'john-doe',
            repo: 'test-repo',
        });
        expect(logger.info).toHaveBeenCalledWith(
            'Posted comment successfully to: john-doe/test-repo#42 (comment id: 123)',
        );
        expect(commentId).toBe(123);
    });

    it('should throw error if failed to post the comment', async () => {
        createCommentMock.mockRejectedValueOnce(new Error('Network error'));

        await expect(
            addCommentToIssue({ issueNumber: 42, comment: 'Hello' }),
        ).rejects.toThrow('Network error');

        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                err: expect.objectContaining({ message: 'Network error' }),
            }),
            'Failed to post comment to: john-doe/test-repo#42',
        );
    });
});
