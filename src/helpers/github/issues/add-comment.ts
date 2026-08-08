import { serializeError } from 'serialize-error';
import * as core from '@actions/core';
import { AppContext } from '../../../context/app-context';
import type { AddCommentToIssueInput } from '../../../types';
import { OctokitClient } from '../client/octokit-client';

export const addCommentToIssue = async (
    input: AddCommentToIssueInput,
): Promise<number> => {
    const { issueNumber, comment: commentBody = '' } = input;
    const {
        github: { repo, owner },
    } = AppContext.getInstance();

    try {
        core.info(`Posting comment to: ${owner}/${repo}#${issueNumber}`);

        const client = OctokitClient.getInstance();

        const { data: comment } = await client.rest.issues.createComment({
            issue_number: issueNumber,
            body: commentBody,
            owner,
            repo,
        });

        core.info(
            `Posted comment successfully to: ${owner}/${repo}#${issueNumber} (comment id: ${comment.id})`,
        );

        return comment.id;
    } catch (err) {
        core.error(
            `Failed to post comment to: ${owner}/${repo}#${issueNumber}`,
        );
        core.debug(`[Error]: ${JSON.stringify(serializeError(err))}`);

        throw err;
    }
};
