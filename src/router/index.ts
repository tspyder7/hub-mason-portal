import intersection from 'lodash/intersection';
import values from 'lodash/values';
import * as core from '@actions/core';
import { serializeError } from 'serialize-error';
import { AppContext } from '../context/app-context';
import { closeIssue, lockIssue } from '../helpers/github/issues';
import type { GithubEvent, Handler } from '../types';
import { IssueType, StatusLabel } from '../utils/constants';
import { postSummaryComment } from '../workflow/summary-comment';
import { upsertStatusComment } from '../workflow/status-comment';
import { updateStatus } from '../workflow/status-label';
import {
    cancelPendingSteps,
    failActiveStep,
    toStepError,
} from '../workflow/steps';

export const routeEvent = async (event: GithubEvent) => {
    const {
        issue: { labels: issueLabels },
    } = event;

    const issueNumber = event.issue.number;

    try {
        await updateStatus(issueNumber, StatusLabel.OPENED);
        await lockIssue({ issueNumber });

        const requests = intersection(
            values(IssueType),
            issueLabels?.map(({ name }) => name),
        );

        if (requests.length > 1) {
            core.error(`Multiple request in given issue: ${requests}`);
            throw new Error('Multiple requests in given issue');
        }

        if (requests.length === 0) {
            core.error(`No request found in given issue: ${requests}`);
            throw new Error('No request found in given issue');
        }

        await updateStatus(issueNumber, StatusLabel.INITIATED);

        const type = requests[0]!;

        AppContext.getInstance().seedSteps(
            (await import(`../handlers/${type}/steps`)).STEPS,
        );

        await upsertStatusComment();

        const handler = (await import(
            `../handlers/${type}/handler`
        )) as Handler;

        core.startGroup(`[${type}]`);
        await handler.handle(event);
        core.endGroup();
    } catch (err) {
        await handleError(issueNumber, err);
    } finally {
        await closeIssue({ issueNumber });

        await postSummaryComment().catch((err) => {
            core.error(
                `Failed to post summary comment on issue #${issueNumber}`,
            );
            core.debug(`[Error]: ${JSON.stringify(serializeError(err))}`);
        });
    }
};

const handleError = async (issueNumber: number, error: unknown) => {
    await failActiveStep(error).catch((err) => {
        core.error(
            `Failed to mark active step as failed on issue #${issueNumber}`,
        );
        core.debug(`[Error]: ${JSON.stringify(serializeError(err))}`);
    });

    try {
        AppContext.getInstance().setRunError(toStepError(error));
        cancelPendingSteps();
        await updateStatus(issueNumber, StatusLabel.FAILED);
        await upsertStatusComment();
    } catch (err) {
        core.error(`Failed to report error on issue #${issueNumber}`);
        core.debug(`[Error]: ${JSON.stringify(serializeError(err))}`);
    }
};
