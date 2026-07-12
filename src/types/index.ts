import type { Issue, PullRequest } from '@octokit/webhooks-types';

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
}
