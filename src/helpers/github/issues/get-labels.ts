import * as core from '@actions/core';
import type { Label } from '@octokit/webhooks-types';
import { serializeError } from 'serialize-error';
import { AppContext } from '../../../context/app-context';
import { OctokitClient } from '../client/octokit-client';

export const getLabelsFromIssue = async (
    issueNumber: number,
): Promise<Label[]> => {
    const { owner, repo } = AppContext.getInstance().github;

    try {
        core.info(
            `Fetching labels from issue: ${owner}/${repo}#${issueNumber}`,
        );

        const client = OctokitClient.getInstance();

        const { data: labels } = await client.rest.issues.listLabelsOnIssue({
            owner,
            repo,
            issue_number: issueNumber,
        });

        core.info(
            `Fetched labels from issue: ${owner}/${repo}#${issueNumber}: ${labels.length}`,
        );

        return labels;
    } catch (err) {
        core.error(
            `Failed to fetch labels from issue: ${owner}/${repo}#${issueNumber}`,
        );
        core.debug(`[Error]: ${JSON.stringify(serializeError(err))}`);

        throw err;
    }
};
