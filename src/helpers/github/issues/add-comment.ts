import { serializeError } from 'serialize-error';
import * as core from '@actions/core';
import { AppContext } from '../../../context/app-context';
import type { AddCommentToIssueInput } from '../../../types';
import { OctokitClient } from '../client/octokit-client';

export const addCommentToIssue = async (
    input: AddCommentToIssueInput,
): Promise<number> => {
    const { issueNumber, comment = '' } = input;
    const { repo, owner } = AppContext.getInstance().github;

    try {
        core.info(`Posting comment to: ${owner}/${repo}#${issueNumber}`);

        const client = OctokitClient.getInstance();

        const { data } = await client.rest.issues.createComment({
            issue_number: issueNumber,
            body: comment,
            owner,
            repo,
        });

        core.info(
            `Posted comment successfully to: ${owner}/${repo}#${issueNumber} (comment id: ${data.id})`,
        );

        return data.id;
    } catch (err) {
        core.error(
            `Failed to post comment to: ${owner}/${repo}#${issueNumber}`,
        );
        core.debug(`[Error]: ${JSON.stringify(serializeError(err))}`);

        throw err;
    }
};
