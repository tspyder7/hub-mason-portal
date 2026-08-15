import { AppContext } from '@/src/context/app-context';
import { StepStatus } from '@/src/utils/constants';
import { createGithubEvent } from '../fixtures/github-event';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

vi.mock('@/src/helpers/github/events', () => ({
    getEvent: getEventMock,
}));

describe('AppContext', () => {
    beforeEach(() => {
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
    });

    it('should create an instance with github and issue details from the event', () => {
        const instance = AppContext.getInstance();

        expect(instance.github).toEqual({
            owner: 'john-doe',
            repo: 'test-repo',
            eventName: 'issues',
            action: 'opened',
            runId: 123,
            actor: 'hub-mason-bot',
            workflow: 'test-workflow',
            requestId: 'R-1',
        });
        expect(instance.issue).toEqual({
            number: 1,
            labels: ['repository/provision-repository'],
            body: 'issue body',
        });
        expect(instance.request).toBeNull();
        expect(instance.statusCommentId).toBeNull();
        expect(instance.steps).toEqual([]);
        expect(instance.runError).toBeNull();
    });

    it('should default labels to an empty array when the issue has no labels', () => {
        const event = {
            ...createGithubEvent(),
            issue: { ...createGithubEvent().issue, labels: undefined },
        };
        getEventMock.mockReturnValue(event);

        const instance = AppContext.getInstance();

        expect(instance.issue.labels).toEqual([]);
    });

    it('should default the body to null when the issue has no body', () => {
        const event = {
            ...createGithubEvent(),
            issue: { ...createGithubEvent().issue, body: null },
        };
        getEventMock.mockReturnValue(event);

        const instance = AppContext.getInstance();

        expect(instance.issue.body).toBeNull();
    });

    it('should return the same instance once created', () => {
        const first = AppContext.getInstance();
        const second = AppContext.getInstance();

        expect(second).toBe(first);
    });

    it('should create a new instance after reset', () => {
        const first = AppContext.getInstance();
        AppContext.reset();

        const second = AppContext.getInstance();

        expect(second).not.toBe(first);
    });

    it('should set the request', () => {
        const instance = AppContext.getInstance();

        instance.setRequest({
            type: 'repository/provision-repository',
            requestId: 'R-1',
            payload: {
                repoName: 'new-repo',
            },
        });

        expect(instance.request).toEqual({
            type: 'repository/provision-repository',
            requestId: 'R-1',
            payload: { repoName: 'new-repo' },
        });
    });

    it('should set the status comment id', () => {
        const instance = AppContext.getInstance();

        instance.setStatusCommentId(42);

        expect(instance.statusCommentId).toBe(42);
    });

    it('should set the steps', () => {
        const instance = AppContext.getInstance();

        instance.setSteps([
            {
                id: 'step-1',
                name: 'Step one',
                status: StepStatus.IN_PROGRESS,
                startedAt: '2026-01-01T00:00:00.000Z',
                details: [],
            },
        ]);

        expect(instance.steps).toEqual([
            {
                id: 'step-1',
                name: 'Step one',
                status: StepStatus.IN_PROGRESS,
                startedAt: '2026-01-01T00:00:00.000Z',
                details: [],
            },
        ]);
    });

    it('should seed steps as pending from the step definitions', () => {
        const instance = AppContext.getInstance();

        instance.seedSteps([
            { id: 'parse-request', name: 'Parse request' },
            { id: 'validate-labels', name: 'Validate labels' },
        ]);

        expect(instance.steps).toEqual([
            {
                id: 'parse-request',
                name: 'Parse request',
                status: StepStatus.PENDING,
                details: [],
            },
            {
                id: 'validate-labels',
                name: 'Validate labels',
                status: StepStatus.PENDING,
                details: [],
            },
        ]);
    });

    it('should throw when the step definitions contain duplicate ids', () => {
        const instance = AppContext.getInstance();

        expect(() =>
            instance.seedSteps([
                { id: 'parse-request', name: 'Parse request' },
                { id: 'parse-request', name: 'Parse request again' },
            ]),
        ).toThrow('Duplicate step ids in step definitions');
    });

    it('should set the run error', () => {
        const instance = AppContext.getInstance();

        instance.setRunError({ message: 'boom' });

        expect(instance.runError).toEqual({ message: 'boom' });
    });
});
