import { getEvent } from 'hub-mason-core/github/event';
import { MemoryStore } from 'hub-mason-core/lifecycle/store/memory-store';

import type { StepError } from 'hub-mason-core/lifecycle/core/types';
import type { Repository } from 'hub-mason-core/types/repository';

import type { GithubInfo, IssueInfo, RequestInfo } from '../types/context';
import { StepStatus } from '../utils/constants';

export class AppContext {
    private static instance: AppContext | undefined;

    readonly github: GithubInfo;
    readonly issue: IssueInfo;

    private readonly _store: MemoryStore<StepStatus>;
    private _request: RequestInfo | null = null;
    private _statusCommentId: number | null = null;
    private _runError: StepError | null = null;

    private constructor() {
        const {
            issue,
            repo: { repo, owner },
            ...rest
        } = getEvent();

        this.github = {
            repo,
            owner,
            ...rest,
        };

        this.issue = {
            number: issue.number,
            labels: issue.labels?.map(({ name }) => name) ?? [],
            body: issue.body,
        };

        this._store = new MemoryStore<StepStatus>();
    }

    static getInstance(): AppContext {
        if (AppContext.instance) return AppContext.instance;

        AppContext.instance = new AppContext();

        return AppContext.instance;
    }

    static reset(): void {
        AppContext.instance = undefined;
    }

    get store(): MemoryStore<StepStatus> {
        return this._store;
    }

    get request(): RequestInfo | null {
        return this._request;
    }

    get statusCommentId(): number | null {
        return this._statusCommentId;
    }

    get runError(): StepError | null {
        return this._runError;
    }

    get repository(): Repository {
        return { owner: this.github.owner, repo: this.github.repo };
    }

    setRequest(request: RequestInfo): void {
        this._request = request;
    }

    setStatusCommentId(commentId: number): void {
        this._statusCommentId = commentId;
    }

    setRunError(error: StepError): void {
        this._runError = error;
    }
}
