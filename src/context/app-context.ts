import { getEvent } from '../helpers/github/events';
import type { GithubInfo, IssueInfo, RequestInfo } from '../types';
import type { Step, StepDefinition, StepError } from '../types/step';
import { StepStatus } from '../utils/constants';

export class AppContext {
    private static instance: AppContext | undefined;

    readonly github: GithubInfo;
    readonly issue: IssueInfo;

    private _request: RequestInfo | null = null;
    private _statusCommentId: number | null = null;
    private _steps: Step[] = [];
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
    }

    static getInstance(): AppContext {
        if (AppContext.instance) return AppContext.instance;

        AppContext.instance = new AppContext();

        return AppContext.instance;
    }

    static reset(): void {
        AppContext.instance = undefined;
    }

    get request(): RequestInfo | null {
        return this._request;
    }

    get statusCommentId(): number | null {
        return this._statusCommentId;
    }

    get steps(): Step[] {
        return this._steps;
    }

    get runError(): StepError | null {
        return this._runError;
    }

    setRequest(request: RequestInfo): void {
        this._request = request;
    }

    setStatusCommentId(commentId: number): void {
        this._statusCommentId = commentId;
    }

    setSteps(steps: Step[]): void {
        this._steps = steps;
    }

    seedSteps(defs: readonly StepDefinition[]): void {
        const ids = defs.map(({ id }) => id);

        if (new Set(ids).size !== ids.length) {
            throw new Error('Duplicate step ids in step definitions');
        }

        this._steps = defs.map(({ id, name }) => ({
            id,
            name,
            status: StepStatus.PENDING,
            details: [],
        }));
    }

    setRunError(error: StepError): void {
        this._runError = error;
    }
}
