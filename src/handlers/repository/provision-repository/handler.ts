import { AppContext } from '@/src/context/app-context';
import { parseIssue } from '@/src/parser/issue-parser';
import type { GithubEvent } from '@/src/types';
import { IssueType, StatusLabel } from '@/src/utils/constants';
import { logger } from '@/src/utils/logger';
import { createSteps } from '@/src/workflow/steps';
import { updateStatus } from '@/src/workflow/status-label';
import { STEPS, Step } from './steps';
import type { ProvisionRepositoryRequest } from './type';
import { validateRequest } from './request-validator';

const { beginStep, finishStep } = createSteps(STEPS);

export const handle = async (event: GithubEvent) => {
    const { body: issueBody, number: issueNumber } = event.issue;

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
    // TODO: trigger a repository_dispatch against the provisioning engine with issue & step metadata.
    await finishStep(Step.PROVISION_REPOSITORY);
};
