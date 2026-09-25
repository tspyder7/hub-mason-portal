import { dispatchWorkflow } from 'hub-mason-core/github/actions/dispatch-workflow';
import { createDispatchContext } from 'hub-mason-core/lifecycle/core/snapshot';
import { logger } from 'hub-mason-core/utils/logger';

import { AppContext } from '@/src/context/app-context';
import { IssueType } from '@/src/utils/constants';
import { getWorkflowSecretKey } from '@/src/workflow/workflow-secret';

import type { LifecycleManager } from 'hub-mason-core/lifecycle/core/manager';
import type { EngineDispatchContext } from '@/src/types/workflow';
import type { StepStatus } from '@/src/utils/constants';
import type { ProvisionRepositoryRequest } from './type';

export const dispatchConfig = {
    repo: 'hub-mason-engine',
    workflowId: 'provision-repository.yml',
    ref: 'main',
    requestType: IssueType.PROVISION_REPOSITORY,
} as const;

export const dispatchProvisionRepository = async (
    request: ProvisionRepositoryRequest,
    lifecycle: LifecycleManager<StepStatus>,
): Promise<void> => {
    const app = AppContext.getInstance();
    const requestId = app.github.requestId;
    const secret = getWorkflowSecretKey();
    const issuedAt = new Date().toISOString();

    const snapshot = lifecycle.getSnapshotWithMeta({
        requestId,
        requestType: dispatchConfig.requestType,
    });

    const dispatchContext = createDispatchContext({
        snapshot,
        requestId,
        requestType: dispatchConfig.requestType,
        issuedAt,
        secret,
        actor: app.github.actor,
    });

    const context: EngineDispatchContext = {
        ...dispatchContext,
        portal: {
            owner: app.github.owner,
            repo: app.github.repo,
            issueNumber: app.issue.number,
            statusCommentId: app.statusCommentId,
        },
    };

    logger.info(
        `Dispatching ${dispatchConfig.workflowId} for request ${requestId} to ${app.github.owner}/${dispatchConfig.repo}@${dispatchConfig.ref}`,
    );

    await dispatchWorkflow(
        {
            workflowId: dispatchConfig.workflowId,
            ref: dispatchConfig.ref,
            inputs: {
                request: JSON.stringify(request),
                context: JSON.stringify(context),
            },
        },
        { owner: app.github.owner, repo: dispatchConfig.repo },
    );
};
