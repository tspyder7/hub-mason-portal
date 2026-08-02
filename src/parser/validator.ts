import some from 'lodash/some';
import * as core from '@actions/core';
import { ActionType, EventType, IssueType } from '../utils/constants';
import type { GithubEvent } from '../types';

export const validateEvent = (event: GithubEvent) => {
    const {
        eventName,
        action,
        issue: { labels: issueLabels },
    } = event;

    if (eventName !== EventType.ISSUES || action !== ActionType.OPENED) {
        core.warning(`Unsupported event & action: ${eventName} & ${action}`);
        throw new Error('Unsupported GitHubEvent');
    }

    const isValidIssue = some(IssueType, (issueType) =>
        some(issueLabels, { name: issueType }),
    );

    if (!isValidIssue) {
        core.warning(`Unsupported issue, no valid issueType is set in labels`);
        throw new Error('Unsupported Issue');
    }
};
