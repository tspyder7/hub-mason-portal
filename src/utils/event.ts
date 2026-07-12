import * as github from '@actions/github';
import type { Issue, PullRequest } from '@octokit/webhooks-types';
import type { GithubEvent } from '../types';

export const getGithubEvent = (): GithubEvent => {
    const { payload, eventName, repo, workflow, runId, actor } = github.context;

    const pullRequest = payload.pull_request as PullRequest;
    const issue = payload.issue as Issue;

    return {
        eventName,
        issue,
        pullRequest,
        repo: { repo: repo.repo, owner: repo.owner },
        action: payload.action,
        workflow,
        runId,
        actor,
    };
};
