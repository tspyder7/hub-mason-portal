import { serializeError } from 'serialize-error';
import * as core from '@actions/core';
import { AppContext } from '../../../context/app-context';
import type { UpdateCommentOnIssueInput } from '../../../types';
import { OctokitClient } from '../client/octokit-client';

export const updateCommentOnIssue = async (
    input: UpdateCommentOnIssueInput,
): Promise<void> => {
    const { commentId, comment } = input;
    const { repo, owner } = AppContext.getInstance().github;

    try {
        core.info(`Updating comment ${commentId} on: ${owner}/${repo}`);

        const client = OctokitClient.getInstance();

        await client.rest.issues.updateComment({
            owner,
            repo,
            comment_id: commentId,
            body: comment,
        });

        core.info(`Updated comment ${commentId} on: ${owner}/${repo}`);
    } catch (err) {
        core.error(
            `Failed to update comment ${commentId} on: ${owner}/${repo}`,
        );
        core.debug(`[Error]: ${JSON.stringify(serializeError(err))}`);

        throw err;
    }
};
