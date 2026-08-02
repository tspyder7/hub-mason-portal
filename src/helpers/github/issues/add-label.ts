import * as core from '@actions/core';
import { serializeError } from 'serialize-error';
import { AppContext } from '../../../context/app-context';
import type { AddLabelToIssueInput } from '../../../types';
import { OctokitClient } from '../client/octokit-client';
import { createLabelInRepo } from '../repository/create-label';

export const addLabelToIssue = async (input: AddLabelToIssueInput) => {
    const { issueNumber, label } = input;
    const { repo, owner } = AppContext.getInstance().github;

    try {
        core.info(
            `Adding ${label.name} label to issue: ${owner}/${repo}#${issueNumber}`,
        );

        await createLabelInRepo(label);

        const client = OctokitClient.getInstance();

        await client.rest.issues.addLabels({
            issue_number: issueNumber,
            labels: [label.name],
            owner,
            repo,
        });

        core.info(
            `Added ${label.name} label to issue: ${owner}/${repo}#${issueNumber}`,
        );
    } catch (err) {
        core.error(
            `Failed to add ${label.name} label to issue: ${owner}/${repo}#${issueNumber}`,
        );
        core.debug(`[Error]: ${JSON.stringify(serializeError(err))}`);

        throw err;
    }
};
