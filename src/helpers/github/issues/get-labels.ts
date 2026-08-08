import type { Label } from '@octokit/webhooks-types';
import { AppContext } from '../../../context/app-context';
import { logger } from '../../../utils/logger';
import { OctokitClient } from '../client/octokit-client';

export const getLabelsFromIssue = async (
    issueNumber: number,
): Promise<Label[]> => {
    const {
        github: { repo, owner },
    } = AppContext.getInstance();

    try {
        logger.info(
            `Fetching labels from issue: ${owner}/${repo}#${issueNumber}`,
        );

        const client = OctokitClient.getInstance();

        const { data: labels } = await client.rest.issues.listLabelsOnIssue({
            owner,
            repo,
            issue_number: issueNumber,
        });

        logger.info(
            `Fetched labels from issue: ${owner}/${repo}#${issueNumber}: ${labels.length}`,
        );

        return labels;
    } catch (err) {
        logger.error(
            { err },
            `Failed to fetch labels from issue: ${owner}/${repo}#${issueNumber}`,
        );

        throw err;
    }
};
