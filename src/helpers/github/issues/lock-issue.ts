import { AppContext } from '../../../context/app-context';
import type { LockIssueInput } from '../../../types';
import { logger } from '../../../utils/logger';
import { OctokitClient } from '../client/octokit-client';

export const lockIssue = async (input: LockIssueInput) => {
    const { issueNumber, lockReason = 'resolved' } = input;
    const {
        github: { repo, owner },
    } = AppContext.getInstance();

    try {
        logger.info(`Locking issue: ${owner}/${repo}#${issueNumber}`);

        const client = OctokitClient.getInstance();

        await client.rest.issues.lock({
            issue_number: issueNumber,
            owner,
            repo,
            lock_reason: lockReason,
        });

        logger.info(`Locked issue: ${owner}/${repo}#${issueNumber}`);
    } catch (err) {
        logger.error(
            { err },
            `Failed to lock issue: ${owner}/${repo}#${issueNumber}`,
        );

        throw err;
    }
};
