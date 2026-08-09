import type { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods';
import type { Issue, Label, PullRequest } from '@octokit/webhooks-types';

export * from './context';
export * from './step';

export type Handler = {
    handle:
        | ((_event: GithubEvent) => void)
        | ((_event: GithubEvent) => Promise<void>);
};

export type RemoveLabelResponse =
    RestEndpointMethodTypes['issues']['removeLabel']['response'];

type IssueLockReason =
    RestEndpointMethodTypes['issues']['lock']['parameters']['lock_reason'];

export type RemoveStatusResult =
    | { success: true; label: Label }
    | { success: false; label: Label; error: unknown };

export interface Repository {
    owner: string;
    repo: string;
}

export interface GithubEvent {
    eventName: string;
    issue: Issue;
    pullRequest: PullRequest;
    repo: Repository;
    action?: string;
    workflow: string;
    runId: number;
    actor: string;
    requestId: string;
}

export interface AddCommentToIssueInput {
    issueNumber: number;
    comment: string;
}

export interface UpdateCommentOnIssueInput {
    commentId: number;
    comment: string;
}

export interface AssignIssueToUserInput {
    issueNumber: number;
    assignee: string[];
}

export interface AddLabelToIssueInput {
    issueNumber: number;
    label: Label;
}

export interface RemoveLabelFromIssueInput {
    issueNumber: number;
    label: Label;
}

export interface LockIssueInput {
    issueNumber: number;
    lockReason?: IssueLockReason;
}

export interface CloseIssueInput {
    issueNumber: number;
}
