import type { Label } from '@octokit/webhooks-types';
import {
    createGithubCommentReporter,
    postSummaryComment as postSummaryCommentCore,
} from 'hub-mason-core/adapters/github/comment-reporter';
import { createGithubLabelReporter } from 'hub-mason-core/adapters/github/label-reporter';
import type { LifecycleManager } from 'hub-mason-core/lifecycle/core/manager';
import type {
    Reporter,
    WorkflowMeta,
} from 'hub-mason-core/lifecycle/core/types';

import { AppContext } from '../context/app-context';
import {
    STATUS_LABEL_PREFIX,
    StepStatus,
    StepStatusEmoji,
} from '../utils/constants';

const failedStatusFilter = (status: StepStatus): boolean =>
    status === StepStatus.FAILED;

export const workflowMeta = (context: AppContext): WorkflowMeta => ({
    requestType: context.request?.type,
    requestId: context.request?.requestId ?? context.github.requestId,
    owner: context.github.owner,
    repo: context.github.repo,
    runId: context.github.runId,
});

export const createPortalCommentReporter = (): Reporter<StepStatus> => ({
    onTransition: async (event) => {
        const context = AppContext.getInstance();

        const reporter = createGithubCommentReporter<StepStatus>({
            repository: context.repository,
            issueNumber: context.issue.number,
            meta: workflowMeta(context),
            emoji: StepStatusEmoji,
            failedStatusFilter,
            runError: context.runError,
            getCommentId: () => context.statusCommentId ?? undefined,
            setCommentId: (commentId: number) => {
                context.setStatusCommentId(commentId);
            },
        });

        await reporter.onTransition?.(event);
    },
});

export const syncStatusComment = async (
    manager: LifecycleManager<StepStatus>,
): Promise<void> => {
    const steps = manager.steps;
    const last = steps[steps.length - 1];

    if (!last) {
        return;
    }

    await createPortalCommentReporter().onTransition?.({
        step: last,
        from: last.status,
        to: last.status,
        all: steps,
    });
};

export const postSummaryComment = async (): Promise<void> => {
    const context = AppContext.getInstance();

    await postSummaryCommentCore({
        repository: context.repository,
        issueNumber: context.issue.number,
        steps: context.store.get(),
        meta: workflowMeta(context),
        emoji: StepStatusEmoji,
        failedStatusFilter,
        runError: context.runError,
    });
};

export const updateStatus = async (
    issueNumber: number,
    to: Label,
): Promise<void> => {
    const { repository } = AppContext.getInstance();

    const reporter = createGithubLabelReporter({
        repository,
        issueNumber,
        labelPrefix: STATUS_LABEL_PREFIX,
    });

    await reporter.updateStatus(to);
};
