import type { Label } from '@octokit/webhooks-types';

export enum EventType {
    ISSUES = 'issues',
}

export enum ActionType {
    OPENED = 'opened',
}

export enum StepStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in-progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
    FAILED = 'failed',
}

export const StepStatusEmoji: Record<StepStatus, string> = {
    [StepStatus.PENDING]: '⏳',
    [StepStatus.IN_PROGRESS]: '🔄',
    [StepStatus.COMPLETED]: '✅',
    [StepStatus.CANCELLED]: '🚫',
    [StepStatus.FAILED]: '❌',
};

export const IssueType = {
    PROVISION_REPOSITORY: 'repository/provision-repository',
};

export type IssueTypeName = (typeof IssueType)[keyof typeof IssueType];

export const STATUS_LABEL_PREFIX = 'status:';

const label = (name: string, color: string, description: string): Label => ({
    id: 0,
    node_id: '',
    url: '',
    name,
    color,
    default: false,
    description,
});

export const StatusLabel = {
    OPENED: label(
        `${STATUS_LABEL_PREFIX}opened`,
        'BFDADC',
        'Issue opened and awaiting processing',
    ),
    INITIATED: label(
        `${STATUS_LABEL_PREFIX}initiated`,
        'FBCA04',
        'Processing has been initiated',
    ),
    IN_PROGRESS: label(
        `${STATUS_LABEL_PREFIX}in-progress`,
        '1D76DB',
        'Automation is currently executing',
    ),
    COMPLETED: label(
        `${STATUS_LABEL_PREFIX}completed`,
        '0E8A16',
        'Request completed successfully',
    ),
    FAILED: label(`${STATUS_LABEL_PREFIX}failed`, 'D73A4A', 'Request failed'),
    CANCELLED: label(
        `${STATUS_LABEL_PREFIX}cancelled`,
        '6A737D',
        'Request was cancelled',
    ),
};
