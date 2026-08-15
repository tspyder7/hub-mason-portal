import { join } from 'path';
import { cwd } from 'process';
import { IssueType, type IssueTypeName } from '../utils/constants';
import { logger } from '../utils/logger';
import { readFileSync } from 'fs';

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
