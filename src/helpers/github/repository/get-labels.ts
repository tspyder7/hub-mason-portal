import type { Label } from '@octokit/webhooks-types';
import { AppContext } from '@/src/context/app-context';
import { logger } from '@/src/utils/logger';
import { OctokitClient } from '../client/octokit-client';

export const getLabelsFromRepo = async (): Promise<Label[]> => {
    const {
        github: { repo, owner },
    } = AppContext.getInstance();

    try {
        logger.info(`Fetching labels from ${owner}/${repo}`);

        const client = OctokitClient.getInstance();

        const { data: labels } = await client.rest.issues.listLabelsForRepo({
            owner,
            repo,
        });

        logger.info(`Fetched labels from ${owner}/${repo}: ${labels.length}`);

        return labels;
    } catch (err) {
        logger.error({ err }, `Failed to fetch labels from ${owner}/${repo}`);

        throw err;
    }
};
