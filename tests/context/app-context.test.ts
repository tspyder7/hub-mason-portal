import { MemoryStore } from 'hub-mason-core/lifecycle/store/memory-store';

import { AppContext } from '@/src/context/app-context';

import { createGithubEvent } from '../fixtures/github-event';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

vi.mock('hub-mason-core/github/event', () => ({
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
        expect(instance.store.get()).toEqual([]);
        expect(instance.runError).toBeNull();
    });

    it('should expose the repository from the github details', () => {
        const instance = AppContext.getInstance();

        expect(instance.repository).toEqual({
            owner: 'john-doe',
            repo: 'test-repo',
        });
    });

    it('should expose a memory store for lifecycle steps', () => {
        const instance = AppContext.getInstance();

        expect(instance.store).toBeInstanceOf(MemoryStore);
        expect(instance.store.get()).toEqual([]);
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

    it('should reset the store after reset', () => {
        const first = AppContext.getInstance();
        first.store.set(() => [
            {
                id: 'step-1',
                name: 'Step one',
                status: 'pending' as never,
                details: [],
            },
        ]);

        AppContext.reset();

        expect(AppContext.getInstance().store.get()).toEqual([]);
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

    it('should set the run error', () => {
        const instance = AppContext.getInstance();

        instance.setRunError({ message: 'boom' });

        expect(instance.runError).toEqual({ message: 'boom' });
    });
});
