import type { Issue, Label, PullRequest } from '@octokit/webhooks-types';
import * as core from '@actions/core';
import { logEvent } from '../../../../src/helpers/github/events';
import type { GithubEvent } from '../../../../src/types';

vi.mock('@actions/core', () => ({
    info: vi.fn(),
    startGroup: vi.fn(),
    endGroup: vi.fn(),
}));

describe('logEvent tests', () => {
    let event: GithubEvent;

    beforeEach(() => {
        event = {
            eventName: 'test-event',
            action: 'test',
            issue: {
                title: 'test issue',
                body: 'this is test issue body',
                number: 100,
                labels: [
                    { name: 'test/label1' },
                    { name: 'test/label2' },
                ] as unknown as Label[],
            } as unknown as Issue,
            repo: { repo: 'default-repo', owner: 'default-owner' },
            pullRequest: {} as unknown as PullRequest,
            workflow: 'test-workflow',
            runId: 1234567890,
            actor: 'test-actor',
        };
    });

    afterAll(() => {
        vi.resetAllMocks();
    });

    it('should log event details in Github Event group', () => {
        logEvent(event);

        expect(core.startGroup).toHaveBeenCalledWith('Github Event');
        expect(core.info).toHaveBeenCalledWith('Event name: test-event');
        expect(core.info).toHaveBeenCalledWith('Action: test');
        expect(core.info).toHaveBeenCalledWith('Issue title: test issue');
        expect(core.info).toHaveBeenCalledWith(
            'Issue body: this is test issue body',
        );
        expect(core.info).toHaveBeenCalledWith('Issue number: 100');
        expect(core.info).toHaveBeenCalledWith(
            'Issue labels: test/label1, test/label2',
        );
        expect(core.info).toHaveBeenCalledWith('Workflow: test-workflow');
        expect(core.info).toHaveBeenCalledWith('Run ID: 1234567890');
        expect(core.endGroup).toHaveBeenCalled();
    });

    it('should log empty Issue labels if not labels does not exists', () => {
        logEvent({
            ...event,
            issue: { labels: undefined } as unknown as Issue,
        });

        expect(core.info).toHaveBeenCalledWith('Issue labels: ');
    });
});
