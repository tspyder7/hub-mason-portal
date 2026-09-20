import type { LifecycleManager } from 'hub-mason-core/lifecycle/core/manager';
import type { GithubEvent } from 'hub-mason-core/types/event';

import type { IssueTypeName, StepStatus } from '../utils/constants';

export type { GithubEvent } from 'hub-mason-core/types/event';
export type { Repository } from 'hub-mason-core/types/repository';

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
    body: string | null;
}

export interface RequestInfo {
    type: IssueTypeName;
    requestId: string;
    payload: Record<string, unknown>;
}

export type HandlerContext = {
    lifecycle: LifecycleManager<StepStatus>;
};

export type Handler = {
    handle: (
        event: GithubEvent,
        context: HandlerContext,
    ) => void | Promise<void>;
};
