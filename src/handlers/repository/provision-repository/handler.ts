import { logger } from 'hub-mason-core/utils/logger';

import { AppContext } from '@/src/context/app-context';
import { parseIssue } from '@/src/parser/issue-parser';
import type { GithubEvent, HandlerContext } from '@/src/types/context';
import { IssueType, StatusLabel } from '@/src/utils/constants';
import { updateStatus } from '@/src/workflow/portal-reporter';
import { dispatchProvisionRepository } from './dispatch';
import { createSteps } from './lifecycle';
import { Step } from './steps';
import type { ProvisionRepositoryRequest } from './type';
import { validateRequest } from './request-validator';

export const handle = async (
    event: GithubEvent,
    context: HandlerContext,
): Promise<void> => {
    const { lifecycle } = context;
    const { beginStep, finishStep } = createSteps(lifecycle);
    const {
        issue: { body: issueBody, number: issueNumber },
    } = event;

    await beginStep(Step.VERIFY_ISSUE);

    if (!issueBody) {
        logger.error('Issue Body is empty or does not exists');
        throw new Error('issueBody not found');
    }

    const request = parseIssue<ProvisionRepositoryRequest>(issueBody);

    AppContext.getInstance().setRequest({
        type: IssueType.PROVISION_REPOSITORY,
        requestId: event.requestId,
        payload: request as unknown as Record<string, unknown>,
    });

    logger.info(`Handling issue #${issueNumber}`);
    logger.info(`ProvisionRepositoryRequest: ${JSON.stringify(request)}`);
    logger.info('Initiating repository provisioning workflow...');
    logger.info(`Request-Id: ${event.requestId}`);

    await finishStep(Step.VERIFY_ISSUE);

    await beginStep(Step.VALIDATE_REQUEST);
    await validateRequest(request);
    await finishStep(Step.VALIDATE_REQUEST);

    await updateStatus(issueNumber, StatusLabel.IN_PROGRESS);

    await beginStep(Step.PROVISION_REPOSITORY);
    await dispatchProvisionRepository(request, lifecycle);
    await finishStep(Step.PROVISION_REPOSITORY);
};
