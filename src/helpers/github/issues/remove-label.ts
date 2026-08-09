import { RequestError } from 'octokit';
import type { RemoveLabelFromIssueInput } from '@/src/types';
import { AppContext } from '@/src/context/app-context';
import { OctokitClient } from '../client';
import { logger } from '@/src/utils/logger';

export const removeLabelFromIssue = async (
    input: RemoveLabelFromIssueInput,
) => {
    const { issueNumber, label } = input;
    const {
        github: { repo, owner },
    } = AppContext.getInstance();

    try {
        logger.info(
            `Removing ${label.name} label from issue: ${owner}/${repo}#${issueNumber}`,
        );

        const client = OctokitClient.getInstance();

        await client.rest.issues.removeLabel({
            repo,
            issue_number: issueNumber,
            owner,
            name: label.name,
        });

        logger.info(
            `Removed ${label.name} label from issue: ${owner}/${repo}#${issueNumber}`,
        );
    } catch (err) {
        if (err instanceof RequestError && err.status === 404) {
            logger.info('Label not found on issue. skipping the removeLabel');
            return;
        }

        logger.error(
            { err },
            `Failed to remove ${label.name} label from issue: ${owner}/${repo}#${issueNumber}`,
        );

        throw err;
    }
};
