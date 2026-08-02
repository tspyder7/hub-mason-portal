import * as core from '@actions/core';
import type { Label } from '@octokit/webhooks-types';
import { serializeError } from 'serialize-error';
import { AppContext } from '../../../context/app-context';
import { OctokitClient } from '../client/octokit-client';

export const getLabelsFromRepo = async (): Promise<Label[]> => {
    const { owner, repo } = AppContext.getInstance().github;

    try {
        core.info(`Fetching labels from ${owner}/${repo}`);

        const client = OctokitClient.getInstance();

        const { data: labels } = await client.rest.issues.listLabelsForRepo({
            owner,
            repo,
        });

        core.info(`Fetched labels from ${owner}/${repo}: ${labels.length}`);

        return labels;
    } catch (err) {
        core.error(`Failed to fetch labels from ${owner}/${repo}`);
        core.debug(`[Error]: ${JSON.stringify(serializeError(err))}`);

        throw err;
    }
};
