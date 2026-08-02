import * as core from '@actions/core';
import type { Label } from '@octokit/webhooks-types';
import { serializeError } from 'serialize-error';
import { AppContext } from '../context/app-context';
import { STATUS_LABEL_PREFIX } from '../utils/constants';
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
        core.warning(`Restored previous status label: ${label.name}`);

        return { success: true, label };
    } catch (error) {
        core.error(`Failed to restore previous status label: ${label.name}`);
        core.debug(`[Error]: ${JSON.stringify(serializeError(error))}`);

        return { success: false, label, error };
    }
};

export const updateStatus = async (issueNumber: number, to: Label) => {
    const { owner, repo } = AppContext.getInstance().github;

    let fromLabels: Label[] = [];
    let removedLabels: Label[] = [];

    try {
        const issueLabels = await getLabelsFromIssue(issueNumber);

        fromLabels = issueLabels.filter(({ name }) =>
            name.startsWith(STATUS_LABEL_PREFIX),
        );

        core.info(
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

        const failedRemoval = removeStatusResult.find(
            (
                result,
            ): result is { success: false; label: Label; error: unknown } =>
                !result.success,
        );

        if (failedRemoval) {
            throw failedRemoval.error;
        }

        await addLabelToIssue({ issueNumber, label: to });

        core.info(`Updated status to ${to.name}`);
    } catch (err) {
        await Promise.all(
            removedLabels.map((label) =>
                restoreStatusLabel(issueNumber, label),
            ),
        );

        core.error(
            fromLabels.length > 0
                ? `Failed to update status from ${fromLabels
                      .map(({ name }) => name)
                      .join(
                          ', ',
                      )} to ${to.name} on ${owner}/${repo}#${issueNumber}`
                : `Failed to update status to ${to.name} on ${owner}/${repo}#${issueNumber}`,
        );
        core.debug(`[Error]: ${JSON.stringify(serializeError(err))}`);

        throw err;
    }
};
