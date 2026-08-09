import { AppContext } from '@/src/context/app-context';
import type { UpdateCommentOnIssueInput } from '@/src/types';
import { logger } from '@/src/utils/logger';
import { OctokitClient } from '../client/octokit-client';

export const updateCommentOnIssue = async (
    input: UpdateCommentOnIssueInput,
): Promise<void> => {
    const { commentId, comment } = input;
    const {
        github: { repo, owner },
    } = AppContext.getInstance();

    try {
        logger.info(`Updating comment ${commentId} on: ${owner}/${repo}`);

        const client = OctokitClient.getInstance();

        await client.rest.issues.updateComment({
            owner,
            repo,
            comment_id: commentId,
            body: comment,
        });

        logger.info(`Updated comment ${commentId} on: ${owner}/${repo}`);
    } catch (err) {
        logger.error(
            { err },
            `Failed to update comment ${commentId} on: ${owner}/${repo}`,
        );

        throw err;
    }
};
