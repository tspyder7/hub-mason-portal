import intersection from 'lodash/intersection';
import values from 'lodash/values';
import { AppContext } from '../context/app-context';
import {
    assignIssueToUser,
    closeIssue,
    lockIssue,
} from '../helpers/github/issues';
import type { GithubEvent, Handler } from '../types';
import { IssueType, StatusLabel } from '../utils/constants';
import { logger } from '../utils/logger';
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

    const {
        number: issueNumber,
        user: { login: issueAuthor },
    } = event.issue;

    try {
        await updateStatus(issueNumber, StatusLabel.OPENED);
        await lockIssue({ issueNumber });
        await assignIssueToUser({
            issueNumber,
            assignee: [issueAuthor],
        });

        const requests = intersection(
            values(IssueType),
            issueLabels?.map(({ name }) => name),
        );

        if (requests.length > 1) {
            logger.error(`Multiple request in given issue: ${requests}`);
            throw new Error('Multiple requests in given issue');
        }

        if (!requests.length) {
            logger.error(`No request found in given issue: ${requests}`);
            throw new Error('No request found in given issue');
        }

        await updateStatus(issueNumber, StatusLabel.INITIATED);

        const type = requests[0]!;

        AppContext.getInstance().seedSteps(
            (
                await import(
                    /* @vite-ignore */
                    `../handlers/${type}/steps`
                )
            ).STEPS,
        );

        await upsertStatusComment();

        const handler = (await import(
            /* @vite-ignore */
            `../handlers/${type}/handler`
        )) as Handler;

        logger.info(`[${type}]`);
        await handler.handle(event);
    } catch (err) {
        await handleError(issueNumber, err);
    } finally {
        await closeIssue({ issueNumber });

        await postSummaryComment().catch((err) => {
            logger.error(
                { err },
                `Failed to post summary comment on issue #${issueNumber}`,
            );
        });
    }
};

const handleError = async (issueNumber: number, error: unknown) => {
    await failActiveStep(error).catch((err) => {
        logger.error(
            { err },
            `Failed to mark active step as failed on issue #${issueNumber}`,
        );
    });

    try {
        AppContext.getInstance().setRunError(toStepError(error));
        cancelPendingSteps();
        await updateStatus(issueNumber, StatusLabel.FAILED);
        await upsertStatusComment();
    } catch (err) {
        logger.error(
            { err },
            `Failed to report error on issue #${issueNumber}`,
        );
    }
};
