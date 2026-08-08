import type { GithubEvent } from '../../src/types';
import type { Label } from '@octokit/webhooks-types';
import { logger } from '../../src/utils/logger';

vi.mock('../../src/utils/constants', async (importOriginal) => {
    const actualModule =
        await importOriginal<typeof import('../../src/utils/constants')>();

    return {
        ...actualModule,
        IssueType: {
            CREATE_REPO: 'repo/create',
            DELETE_REPO: 'repo/delete',
        },
    };
});

import { validateEvent } from '../../src/parser/validator';

vi.mock('../../src/utils/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

describe('validateEvent tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should log and throw error when eventName is not issues and action is not opened', () => {
        const event = {
            eventName: 'pull-request',
            action: 'closed',
            issue: {
                labels: [] as unknown as Label[],
            },
        } as unknown as GithubEvent;

        expect(() => validateEvent(event)).toThrow('Unsupported GitHubEvent');

        expect(logger.warn).toHaveBeenCalledTimes(1);
        expect(logger.warn).toHaveBeenCalledWith(
            'Unsupported event & action: pull-request & closed',
        );
    });

    it('should log and throw error when issue is not valid', () => {
        const event = {
            eventName: 'issues',
            action: 'opened',
            issue: {
                labels: [
                    { name: 'repo/close' },
                    { name: 'pull-request/comment' },
                ] as unknown as Label[],
            },
        } as unknown as GithubEvent;

        expect(() => validateEvent(event)).toThrow('Unsupported Issue');

        expect(logger.warn).toHaveBeenCalledTimes(1);
        expect(logger.warn).toHaveBeenCalledWith(
            'Unsupported issue, no valid issueType is set in labels',
        );
    });

    it('should validate event successfully if event is valid', () => {
        const event = {
            eventName: 'issues',
            action: 'opened',
            issue: {
                labels: [
                    { name: 'repo/create' },
                    { name: 'repo/delete' },
                ] as unknown as Label[],
            },
        } as unknown as GithubEvent;

        expect(() => validateEvent(event)).not.toThrow();
        expect(logger.warn).toHaveBeenCalledTimes(0);
    });
});
