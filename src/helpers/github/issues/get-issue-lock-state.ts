import { AppContext } from '@/src/context/app-context';
import { logger } from '@/src/utils/logger';
import { OctokitClient } from '../client/octokit-client';
import type { IssueLockState } from '@/src/types';

export const getIssueLockState = async (
    issueNumber: number,
): Promise<IssueLockState> => {
    const {
        github: { repo, owner },
    } = AppContext.getInstance();

    try {
        logger.info(
            `Fetching lock state of issue: ${owner}/${repo}#${issueNumber}`,
        );

        const client = OctokitClient.getInstance();

        const {
            data: { locked, active_lock_reason: activeLockReason = '' },
        } = await client.rest.issues.get({
            issue_number: issueNumber,
            owner,
            repo,
        });

        logger.info(
            `Fetched lock state of issue: ${owner}/${repo}#${issueNumber} (locked: ${locked})`,
        );

        return {
            locked,
            activeLockReason,
        };
    } catch (err) {
        logger.error(
            { err },
            `Failed to fetch lock state of issue: ${owner}/${repo}#${issueNumber}`,
        );

        throw err;
    }
};
