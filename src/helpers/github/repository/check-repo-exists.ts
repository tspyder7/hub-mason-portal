import * as core from '@actions/core';
import { serializeError } from 'serialize-error';
import { RequestError } from 'octokit';
import { AppContext } from '../../../context/app-context';
import { OctokitClient } from '../client/octokit-client';

export const checkRepoExists = async (
    repoToCheck?: string,
): Promise<boolean> => {
    const { owner, repo } = AppContext.getInstance().github;

    const requestedRepoName = repoToCheck ?? repo;

    try {
        core.info(
            `Checking if repository ${owner}/${requestedRepoName} exists`,
        );

        const client = OctokitClient.getInstance();

        await client.rest.repos.get({ owner, repo: requestedRepoName });

        core.info(`Repository ${owner}/${requestedRepoName} exists`);

        return true;
    } catch (err) {
        const error =
            err instanceof RequestError
                ? (err as RequestError)
                : serializeError(err);

        if (error.status === 404) {
            core.info(
                `Repository ${owner}/${requestedRepoName} does not exist`,
            );
            return false;
        }

        core.error(
            `Failed to check if repository ${owner}/${requestedRepoName} exists`,
        );
        core.debug(`[Error]: ${JSON.stringify(serializeError(err))}`);

        throw error;
    }
};
