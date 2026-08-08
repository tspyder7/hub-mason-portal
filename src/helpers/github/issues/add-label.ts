import { AppContext } from '../../../context/app-context';
import type { AddLabelToIssueInput } from '../../../types';
import { logger } from '../../../utils/logger';
import { OctokitClient } from '../client/octokit-client';
import { createLabelInRepo } from '../repository/create-label';

export const addLabelToIssue = async (input: AddLabelToIssueInput) => {
    const { issueNumber, label } = input;
    const {
        github: { repo, owner },
    } = AppContext.getInstance();

    try {
        logger.info(
            `Adding ${label.name} label to issue: ${owner}/${repo}#${issueNumber}`,
        );

        await createLabelInRepo(label);

        const client = OctokitClient.getInstance();

        await client.rest.issues.addLabels({
            issue_number: issueNumber,
            labels: [label.name],
            owner,
            repo,
        });

        logger.info(
            `Added ${label.name} label to issue: ${owner}/${repo}#${issueNumber}`,
        );
    } catch (err) {
        logger.error(
            { err },
            `Failed to add ${label.name} label to issue: ${owner}/${repo}#${issueNumber}`,
        );

        throw err;
    }
};
