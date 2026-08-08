import * as core from '@actions/core';
import type { RemoveLabelFromIssueInput } from '../../../types';
import { AppContext } from '../../../context/app-context';
import { OctokitClient } from '../client';
import { serializeError } from 'serialize-error';
import { RequestError } from 'octokit';

export const removeLabelFromIssue = async (
    input: RemoveLabelFromIssueInput,
) => {
    const { issueNumber, label } = input;
    const {
        github: { repo, owner },
    } = AppContext.getInstance();

    try {
        core.info(
            `Removing ${label.name} label from issue: ${owner}/${repo}#${issueNumber}`,
        );

        const client = OctokitClient.getInstance();

        await client.rest.issues.removeLabel({
            repo,
            issue_number: issueNumber,
            owner,
            name: label.name,
        });

        core.info(
            `Removed ${label.name} label from issue: ${owner}/${repo}#${issueNumber}`,
        );
    } catch (err) {
        const error =
            err instanceof RequestError
                ? (err as RequestError)
                : serializeError(err);

        if (error.status === 404) {
            core.info('Label not found on issue. skipping the removeLabel');
            return;
        } else {
            core.error(
                `Failed to remove ${label.name} label from issue: ${owner}/${repo}#${issueNumber}`,
            );
            core.debug(`[Error]: ${JSON.stringify(serializeError(err))}`);
            throw error;
        }
    }
};
