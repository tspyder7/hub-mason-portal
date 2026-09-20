import { getEvent, logEvent } from 'hub-mason-core/github/event';

import { routeEvent } from '@/src/router';

import { createGithubEvent } from './fixtures/github-event';

vi.mock('hub-mason-core/github/event');

vi.mock('@/src/router', () => ({
    routeEvent: vi.fn(),
}));

describe('app tests', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.restoreAllMocks();

        vi.mocked(getEvent).mockReturnValue(createGithubEvent());
        vi.mocked(routeEvent).mockResolvedValue(undefined);
    });

    it('should get the event, log it, init the app context and route it', async () => {
        await import('../src/app');

        expect(getEvent).toHaveBeenCalled();
        expect(logEvent).toHaveBeenCalledWith(createGithubEvent());
        expect(routeEvent).toHaveBeenCalledWith(createGithubEvent());
    });
});
