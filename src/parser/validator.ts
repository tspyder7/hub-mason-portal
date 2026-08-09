import some from 'lodash/some';
import { ActionType, EventType, IssueType } from '../utils/constants';
import { logger } from '../utils/logger';
import type { GithubEvent } from '../types';

export const validateEvent = (event: GithubEvent) => {
    const {
        eventName,
        action,
        issue: { labels: issueLabels },
    } = event;

    if (eventName !== EventType.ISSUES || action !== ActionType.OPENED) {
        logger.warn(`Unsupported event & action: ${eventName} & ${action}`);
        throw new Error('Unsupported GitHubEvent');
    }

    const isValidIssue = some(IssueType, (issueType) =>
        some(issueLabels, { name: issueType }),
    );

    if (!isValidIssue) {
        logger.warn('Unsupported issue, no valid issueType is set in labels');
        throw new Error('Unsupported Issue');
    }
};
