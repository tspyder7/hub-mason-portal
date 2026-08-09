import { AppContext } from '@/src/context/app-context';
import type { UnlockIssueInput } from '@/src/types';
import { logger } from '@/src/utils/logger';
import { OctokitClient } from '../client/octokit-client';

export const unlockIssue = async (input: UnlockIssueInput) => {
    const { issueNumber } = input;
    const {
        github: { repo, owner },
    } = AppContext.getInstance();

    try {
        logger.info(`Unlocking issue: ${owner}/${repo}#${issueNumber}`);

        const client = OctokitClient.getInstance();

        await client.rest.issues.unlock({
            issue_number: issueNumber,
            owner,
            repo,
        });

        logger.info(`Unlocked issue: ${owner}/${repo}#${issueNumber}`);
    } catch (err) {
        logger.error(
            { err },
            `Failed to unlock issue: ${owner}/${repo}#${issueNumber}`,
        );

        throw err;
    }
};
