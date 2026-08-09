import { AppContext } from '@/src/context/app-context';
import type { CloseIssueInput } from '@/src/types';
import { logger } from '@/src/utils/logger';
import { OctokitClient } from '../client/octokit-client';

export const closeIssue = async (input: CloseIssueInput) => {
    const { issueNumber } = input;
    const {
        github: { repo, owner },
    } = AppContext.getInstance();

    try {
        logger.info(`Closing issue: ${owner}/${repo}#${issueNumber}`);

        const client = OctokitClient.getInstance();

        await client.rest.issues.update({
            issue_number: issueNumber,
            owner,
            repo,
            state: 'closed',
        });

        logger.info(`Closed issue: ${owner}/${repo}#${issueNumber}`);
    } catch (err) {
        logger.error(
            { err },
            `Failed to close issue: ${owner}/${repo}#${issueNumber}`,
        );
    }
};
