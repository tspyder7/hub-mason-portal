import * as core from '@actions/core';
import { serializeError } from 'serialize-error';
import { RequestError } from 'octokit';
import { AppContext } from '../../../context/app-context';
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
        core.info(`Checking if repository ${requestedOwner}/${repo} exists`);

        const client = OctokitClient.getInstance();

        await client.rest.repos.get({
            owner: requestedOwner,
            repo,
        });

        core.info(`Repository ${requestedOwner}/${repo} exists`);

        return true;
    } catch (err) {
        const error =
            err instanceof RequestError
                ? (err as RequestError)
                : serializeError(err);

        if (error.status === 404) {
            core.info(`Repository ${requestedOwner}/${repo} does not exist`);
            return false;
        }

        core.error(
            `Failed to check if repository ${requestedOwner}/${repo} exists`,
        );
        core.debug(`[Error]: ${JSON.stringify(serializeError(err))}`);

        throw error;
    }
};
