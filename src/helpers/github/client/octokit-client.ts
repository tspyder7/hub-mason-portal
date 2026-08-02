import { Octokit } from 'octokit';

export class OctokitClient {
    private static instance: Octokit | null;

    /* v8 ignore next */
    private constructor() {}

    static getInstance(): Octokit {
        if (OctokitClient.instance) return OctokitClient.instance;

        const { HUB_MASON_APP_TOKEN: authToken } = process.env!;

        if (!authToken)
            throw new Error(
                'Missing required environment variable: HUB_MASON_APP_TOKEN',
            );

        OctokitClient.instance = new Octokit({
            auth: authToken,
        });

        return OctokitClient.instance;
    }
}
