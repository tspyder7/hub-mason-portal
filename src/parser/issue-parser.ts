import { parseIssue as parse } from '@github/issue-parser';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';

export const parseIssue = <T>(issueBody: string): T => {
    const templateMatch = issueBody.match(
        /<!--\s*template-id:\s*([\w-]+\.[\w]+)\s*-->/,
    );

    if (!templateMatch) {
        logger.error('Issue body does not include template-id');
        throw new Error('template-id not found in issueBody');
    }

    const templateId = templateMatch[1]!;

    const template = readFileSync(
        join(process.cwd(), '.github', 'ISSUE_TEMPLATE', templateId),
        'utf-8',
    );

    const parsedBody = parse(issueBody, template);

    return parsedBody as T;
};
