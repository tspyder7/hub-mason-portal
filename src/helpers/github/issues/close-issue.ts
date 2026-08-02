import * as core from '@actions/core';
import { serializeError } from 'serialize-error';
import { AppContext } from '../../../context/app-context';
import type { CloseIssueInput } from '../../../types';
import { OctokitClient } from '../client/octokit-client';

export const closeIssue = async (input: CloseIssueInput) => {
    const { issueNumber } = input;
    const { repo, owner } = AppContext.getInstance().github;

    try {
        core.info(`Closing issue: ${owner}/${repo}#${issueNumber}`);

        const client = OctokitClient.getInstance();

        await client.rest.issues.update({
            issue_number: issueNumber,
            owner,
            repo,
            state: 'closed',
        });

        core.info(`Closed issue: ${owner}/${repo}#${issueNumber}`);
    } catch (err) {
        core.error(`Failed to close issue: ${owner}/${repo}#${issueNumber}`);
        core.debug(`[Error]: ${JSON.stringify(serializeError(err))}`);
    }
};
