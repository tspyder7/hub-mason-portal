import type { GithubEvent } from '../../src/types';

export const createGithubEvent = (): GithubEvent =>
    ({
        eventName: 'issues',
        action: 'opened',
        issue: {
            number: 1,
            title: 'Test issue',
            body: 'issue body',
            labels: [{ name: 'repository/provision-repository' }],
        },
        repo: {
            owner: 'john-doe',
            repo: 'test-repo',
        },
        workflow: 'test-workflow',
        runId: 123,
        actor: 'hub-mason-bot',
        requestId: 'R-1',
    }) as unknown as GithubEvent;
