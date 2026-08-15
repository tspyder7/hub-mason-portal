import { parseIssue as parse } from '@github/issue-parser';
import { AppContext } from '../context/app-context';
import { getIssueTemplate } from '../config/issue-template.config';

export const parseIssue = <T>(issueBody: string): T => {
    const {
        issue: { labels: initialLabels },
    } = AppContext.getInstance();

    const requestType = initialLabels[0]!;

    const template = getIssueTemplate(requestType);

    const parsedBody = parse(issueBody, template);

    return parsedBody as T;
};
