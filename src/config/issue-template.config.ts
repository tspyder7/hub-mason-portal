import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { logger } from 'hub-mason-core/utils/logger';
import { IssueType, type IssueTypeName } from '../utils/constants';

const ISSUE_TEMPLATE_BASE_PATH = join(cwd(), '.github', 'ISSUE_TEMPLATE');

const IssueTemplate: Map<IssueTypeName, string> = new Map<string, string>([
    [IssueType.PROVISION_REPOSITORY, 'repo-provisioning-request.yml'],
]);

export const getIssueTemplate = (requestType: string): string => {
    const templateId = IssueTemplate.get(requestType);

    if (!templateId) {
        logger.error(
            `Unable to resolve template id using request type: ${requestType}`,
        );
        throw new Error('Unable to resolve template-id');
    }

    const template = readFileSync(
        join(ISSUE_TEMPLATE_BASE_PATH, templateId),
        'utf-8',
    );

    return template;
};
