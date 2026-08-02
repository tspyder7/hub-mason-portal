import type { IssueTypeName } from '../utils/constants';

export interface GithubInfo {
    owner: string;
    repo: string;
    eventName: string;
    action?: string;
    runId: number;
    actor: string;
    workflow: string;
    requestId: string;
}

export interface IssueInfo {
    number: number;
    labels: string[];
}

export interface RequestInfo {
    type: IssueTypeName;
    requestId: string;
    payload: Record<string, unknown>;
}
