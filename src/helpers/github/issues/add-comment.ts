import { AppContext } from '@/src/context/app-context';
import type { AddCommentToIssueInput } from '@/src/types';
import { logger } from '@/src/utils/logger';
import { OctokitClient } from '../client/octokit-client';

export const addCommentToIssue = async (
    input: AddCommentToIssueInput,
): Promise<number> => {
    const { issueNumber, comment: commentBody = '' } = input;
    const {
        github: { repo, owner },
    } = AppContext.getInstance();

    try {
        logger.info(`Posting comment to: ${owner}/${repo}#${issueNumber}`);

        const client = OctokitClient.getInstance();

        const { data: comment } = await client.rest.issues.createComment({
            issue_number: issueNumber,
            body: commentBody,
            owner,
            repo,
        });

        logger.info(
            `Posted comment successfully to: ${owner}/${repo}#${issueNumber} (comment id: ${comment.id})`,
        );

        return comment.id;
    } catch (err) {
        logger.error(
            { err },
            `Failed to post comment to: ${owner}/${repo}#${issueNumber}`,
        );

        throw err;
    }
};
