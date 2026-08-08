import type { Label } from '@octokit/webhooks-types';
import { AppContext } from '../../../context/app-context';
import { logger } from '../../../utils/logger';
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
            logger.info('Label already exists, skipping label creation');
            return;
        }

        logger.info(`Creating label in ${owner}/${repo}`);

        const client = OctokitClient.getInstance();

        await client.rest.issues.createLabel({
            owner,
            repo,
            name: label.name,
            description: label.description || '',
            color: label.color,
        });

        logger.info(`Created label in ${owner}/${repo}: ${label.name}`);
    } catch (err) {
        logger.error({ err }, `Failed to create label in ${owner}/${repo}`);

        throw err;
    }
};
