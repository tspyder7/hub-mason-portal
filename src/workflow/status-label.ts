import type { Label } from '@octokit/webhooks-types';
import { AppContext } from '../context/app-context';
import { STATUS_LABEL_PREFIX } from '../utils/constants';
import { logger } from '../utils/logger';
import {
    addLabelToIssue,
    getLabelsFromIssue,
    removeLabelFromIssue,
} from '../helpers/github/issues';
import type { RemoveStatusResult } from '../types';

const removeStatusLabel = async (
    issueNumber: number,
    label: Label,
): Promise<RemoveStatusResult> => {
    try {
        await removeLabelFromIssue({ issueNumber, label });

        return { success: true, label };
    } catch (error) {
        return { success: false, label, error };
    }
};

const restoreStatusLabel = async (
    issueNumber: number,
    label: Label,
): Promise<RemoveStatusResult> => {
    try {
        await addLabelToIssue({ issueNumber, label });
        logger.warn(`Restored previous status label: ${label.name}`);

        return { success: true, label };
    } catch (error) {
        logger.error(
            { err: error },
            `Failed to restore previous status label: ${label.name}`,
        );

        return { success: false, label, error };
    }
};

export const updateStatus = async (issueNumber: number, to: Label) => {
    const {
        github: { repo, owner },
    } = AppContext.getInstance();

    let fromLabels: Label[] = [];
    let removedLabels: Label[] = [];

    try {
        const issueLabels = await getLabelsFromIssue(issueNumber);

        fromLabels = issueLabels.filter(({ name }) =>
            name.startsWith(STATUS_LABEL_PREFIX),
        );

        logger.info(
            fromLabels.length > 0
                ? `Updating status: ${fromLabels
                      .map(({ name }) => name)
                      .join(', ')} -> ${to.name}`
                : `Adding status label: ${to.name}`,
        );

        const removeStatusResult = await Promise.all(
            fromLabels.map((label) => removeStatusLabel(issueNumber, label)),
        );

        removedLabels = removeStatusResult
            .filter(
                (result): result is { success: true; label: Label } =>
                    result.success,
            )
            .map(({ label }) => label);

        const removeStatusFailure = removeStatusResult.find(
            (
                result,
            ): result is { success: false; label: Label; error: unknown } =>
                !result.success,
        );

        if (removeStatusFailure) {
            throw removeStatusFailure.error;
        }

        await addLabelToIssue({ issueNumber, label: to });

        logger.info(`Updated status to ${to.name}`);
    } catch (err) {
        await Promise.all(
            removedLabels.map((label) =>
                restoreStatusLabel(issueNumber, label),
            ),
        );

        logger.error(
            { err },
            fromLabels.length > 0
                ? `Failed to update status from ${fromLabels
                      .map(({ name }) => name)
                      .join(
                          ', ',
                      )} to ${to.name} on ${owner}/${repo}#${issueNumber}`
                : `Failed to update status to ${to.name} on ${owner}/${repo}#${issueNumber}`,
        );

        throw err;
    }
};
