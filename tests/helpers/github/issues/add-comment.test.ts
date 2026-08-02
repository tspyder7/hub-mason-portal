import * as core from '@actions/core';
import { AppContext } from '../../../../src/context/app-context';
import { addCommentToIssue } from '../../../../src/helpers/github/issues';
import { OctokitClient } from '../../../../src/helpers/github/client/octokit-client';
import { createGithubEvent } from '../../../fixtures/github-event';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

vi.mock('../../../../src/helpers/github/events', () => ({
    getEvent: getEventMock,
}));

vi.mock('@actions/core', () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
}));

const createComment = vi.fn();

vi.spyOn(OctokitClient, 'getInstance').mockReturnValue({
    rest: {
        issues: {
            createComment,
        },
    },
} as never);

describe('addCommentToIssue tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
        createComment.mockResolvedValue({ data: { id: 123 } });
    });

    afterAll(() => {
        vi.resetAllMocks();
    });

    it('should post comment to the issue and return the comment id', async () => {
        const commentId = await addCommentToIssue({
            issueNumber: 42,
            comment: 'Hello world',
        });

        expect(createComment).toHaveBeenCalledWith({
            issue_number: 42,
            body: 'Hello world',
            owner: 'john-doe',
            repo: 'test-repo',
        });
        expect(core.info).toHaveBeenCalledWith(
            'Posted comment successfully to: john-doe/test-repo#42 (comment id: 123)',
        );
        expect(commentId).toBe(123);
    });

    it('should throw error if failed to post the comment', async () => {
        createComment.mockRejectedValueOnce(new Error('Network error'));

        await expect(
            addCommentToIssue({ issueNumber: 42, comment: 'Hello' }),
        ).rejects.toThrow('Network error');

        expect(core.error).toHaveBeenCalledWith(
            'Failed to post comment to: john-doe/test-repo#42',
        );
        expect(core.debug).toHaveBeenCalledOnce();
    });
});
