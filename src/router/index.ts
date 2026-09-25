import {
    assignIssueToUser,
    closeIssue,
    lockIssue,
} from 'hub-mason-core/github/issues';
import { failActiveStep } from 'hub-mason-core/lifecycle/core/bound-steps';
import { toStepError } from 'hub-mason-core/lifecycle/core/errors';
import { logger } from 'hub-mason-core/utils/logger';
import intersection from 'lodash/intersection';
import values from 'lodash/values';

import { AppContext } from '../context/app-context';
import { IssueType, StatusLabel, StepStatus } from '../utils/constants';
import {
    postSummaryComment,
    syncStatusComment,
    updateStatus,
} from '../workflow/portal-reporter';

import type { LifecycleManager } from 'hub-mason-core/lifecycle/core/manager';
import type { GithubEvent, Handler, HandlerContext } from '../types/context';

export const routeEvent = async (event: GithubEvent): Promise<void> => {
    let hasError: boolean = false;
    let lifecycle: LifecycleManager<StepStatus> | undefined;

    const {
        issue: { labels: issueLabels },
    } = event;

    const {
        number: issueNumber,
        user: { login: issueAuthor },
    } = event.issue;

    const { repository } = AppContext.getInstance();

    try {
        await updateStatus(issueNumber, StatusLabel.OPENED);
        await lockIssue({ issueNumber }, repository);
        await assignIssueToUser(
            {
                issueNumber,
                assignee: [issueAuthor],
            },
            repository,
        );

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

        const lifecycleModule = (await import(
            /* @vite-ignore */
            `../handlers/${type}/lifecycle`
        )) as {
            createLifecycle: () => LifecycleManager<StepStatus>;
        };

        lifecycle = lifecycleModule.createLifecycle();

        await syncStatusComment(lifecycle);

        const handler = (await import(
            /* @vite-ignore */
            `../handlers/${type}/handler`
        )) as Handler;

        const context: HandlerContext = { lifecycle };

        logger.info(`[${type}]`);
        await handler.handle(event, context);
    } catch (err) {
        await handleError(issueNumber, err, lifecycle);
        hasError = true;
    }

    if (hasError) {
        await closeIssue({ issueNumber }, repository).catch(() => {});

        await postSummaryComment().catch((err) => {
            logger.error(
                { err },
                `Failed to post summary comment on issue #${issueNumber}`,
            );
        });

        process.exit(1);
    }
};

const handleError = async (
    issueNumber: number,
    error: unknown,
    lifecycle: LifecycleManager<StepStatus> | undefined,
): Promise<void> => {
    lifecycle &&
        (await failActiveStep({
            manager: lifecycle,
            running: StepStatus.IN_PROGRESS,
            failed: StepStatus.FAILED,
            error,
        }).catch((err) => {
            logger.error(
                { err },
                `Failed to mark active step as failed on issue #${issueNumber}`,
            );
        }));

    try {
        AppContext.getInstance().setRunError(toStepError(error));
        lifecycle?.cancelPending();
        await updateStatus(issueNumber, StatusLabel.FAILED);
        lifecycle && (await syncStatusComment(lifecycle));
    } catch (err) {
        logger.error(
            { err },
            `Failed to report error on issue #${issueNumber}`,
        );
    }
};
