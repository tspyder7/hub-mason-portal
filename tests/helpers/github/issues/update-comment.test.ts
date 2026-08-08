import * as core from '@actions/core';
import { AppContext } from '../../../../src/context/app-context';
import { OctokitClient } from '../../../../src/helpers/github/client/octokit-client';
import { updateCommentOnIssue } from '../../../../src/helpers/github/issues';
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

const updateComment = vi.fn();

vi.spyOn(OctokitClient, 'getInstance').mockReturnValue({
    rest: {
        issues: {
            updateComment,
        },
    },
} as never);

describe('updateCommentOnIssue tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
        updateComment.mockResolvedValue({ data: { id: 7 } });
    });

    afterAll(() => {
        vi.resetAllMocks();
    });

    it('should update the comment on the issue', async () => {
        await updateCommentOnIssue({
            commentId: 7,
            comment: 'Updated body',
        });

        expect(updateComment).toHaveBeenCalledWith({
            owner: 'john-doe',
            repo: 'test-repo',
            comment_id: 7,
            body: 'Updated body',
        });
        expect(core.info).toHaveBeenCalledWith(
            'Updated comment 7 on: john-doe/test-repo',
        );
    });

    it('should throw error if failed to update the comment', async () => {
        updateComment.mockRejectedValueOnce(new Error('Network error'));

        await expect(
            updateCommentOnIssue({ commentId: 7, comment: 'Updated body' }),
        ).rejects.toThrow('Network error');

        expect(core.error).toHaveBeenCalledWith(
            'Failed to update comment 7 on: john-doe/test-repo',
        );
        expect(core.debug).toHaveBeenCalledOnce();
    });
});
