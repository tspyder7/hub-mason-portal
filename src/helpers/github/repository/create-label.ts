import * as core from '@actions/core';
import type { Label } from '@octokit/webhooks-types';
import { serializeError } from 'serialize-error';
import { AppContext } from '../../../context/app-context';
import { OctokitClient } from '../client/octokit-client';
import { getLabelsFromRepo } from './get-labels';

export const createLabelInRepo = async (label: Label) => {
    const {
        github: { repo, owner },
    } = AppContext.getInstance();

    try {
        const labels = await getLabelsFromRepo();

        const isLabelExists = !!labels.find(({ name }) => name === label.name);

        if (isLabelExists) {
            core.info('Label already exists, skipping label creation');
            return;
        }

        core.info(`Creating label in ${owner}/${repo}`);

        const client = OctokitClient.getInstance();

        await client.rest.issues.createLabel({
            owner,
            repo,
            name: label.name,
            description: label.description || '',
            color: label.color,
        });

        core.info(`Created label in ${owner}/${repo}: ${label.name}`);
    } catch (err) {
        core.error(`Failed to create label in ${owner}/${repo}`);
        core.debug(`[Error]: ${JSON.stringify(serializeError(err))}`);

        throw err;
    }
};
