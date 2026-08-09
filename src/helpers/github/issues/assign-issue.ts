import { AppContext } from '@/src/context/app-context';
import type { AssignIssueToUserInput } from '@/src/types';
import { logger } from '@/src/utils/logger';
import { OctokitClient } from '../client/octokit-client';

export const assignIssueToUser = async (input: AssignIssueToUserInput) => {
    const { issueNumber, assignee } = input;
    const {
        github: { repo, owner },
    } = AppContext.getInstance();

    try {
        logger.info(
            `Assigning issue to: ${assignee.join(', ')} - ${owner}/${repo}#${issueNumber}`,
        );

        const client = OctokitClient.getInstance();

        await client.rest.issues.addAssignees({
            issue_number: issueNumber,
            assignees: assignee,
            owner,
            repo,
        });

        logger.info(
            `Assigned issue to: ${assignee.join(', ')} - ${owner}/${repo}#${issueNumber}`,
        );
    } catch (err) {
        logger.error(
            { err },
            `Failed to assign issue to: ${assignee.join(', ')} - ${owner}/${repo}#${issueNumber}`,
        );

        throw err;
    }
};
