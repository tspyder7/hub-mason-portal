import { getEvent } from '../helpers/github/events';
import type { GithubInfo, IssueInfo, RequestInfo } from '../types';
import type { Step, StepDefinition, StepError } from '../types/step';
import { StepStatus, type IssueTypeName } from '../utils/constants';

export class AppContext {
    private static instance: AppContext | undefined;

    readonly github: GithubInfo;
    readonly issue: IssueInfo;

    private _request: RequestInfo | null = null;
    private _statusCommentId: number | null = null;
    private _steps: Step[] = [];
    private _runError: StepError | null = null;

    private constructor() {
        const event = getEvent();

        this.github = {
            owner: event.repo.owner,
            repo: event.repo.repo,
            eventName: event.eventName,
            action: event.action,
            runId: event.runId,
            actor: event.actor,
            workflow: event.workflow,
            requestId: event.requestId,
        };

        this.issue = {
            number: event.issue.number,
            labels: event.issue.labels?.map(({ name }) => name) ?? [],
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

    setRequest(
        type: IssueTypeName,
        requestId: string,
        payload: Record<string, unknown>,
    ): void {
        this._request = { type, requestId, payload };
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
