import { RequestError } from 'octokit';
import { AppContext } from '../../../context/app-context';
import { logger } from '../../../utils/logger';
import { OctokitClient } from '../client/octokit-client';

export const checkRepoExists = async (
    repo: string,
    owner?: string,
): Promise<boolean> => {
    const {
        github: { owner: currentOwner },
    } = AppContext.getInstance();

    const requestedOwner = owner ?? currentOwner;

    try {
        logger.info(`Checking if repository ${requestedOwner}/${repo} exists`);

        const client = OctokitClient.getInstance();

        await client.rest.repos.get({
            owner: requestedOwner,
            repo,
        });

        logger.info(`Repository ${requestedOwner}/${repo} exists`);

        return true;
    } catch (err) {
        if (err instanceof RequestError && err.status === 404) {
            logger.info(`Repository ${requestedOwner}/${repo} does not exist`);
            return false;
        }

        logger.error(
            { err },
            `Failed to check if repository ${requestedOwner}/${repo} exists`,
        );

        throw err;
    }
};
