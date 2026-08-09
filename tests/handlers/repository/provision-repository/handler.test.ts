import { AppContext } from '@/src/context/app-context';
import { handle } from '@/src/handlers/repository/provision-repository/handler';
import { parseIssue } from '@/src/parser/issue-parser';
import type { GithubEvent } from '@/src/types';
import { StatusLabel } from '@/src/utils/constants';
import { logger } from '@/src/utils/logger';
import { validateRequest } from '@/src/handlers/repository/provision-repository/request-validator';
import { updateStatus } from '@/src/workflow/status-label';
import { createGithubEvent } from '../../../fixtures/github-event';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

const { beginStep, finishStep } = vi.hoisted(() => ({
    beginStep: vi.fn(),
    finishStep: vi.fn(),
}));

vi.mock('@/src/helpers/github/events', () => ({
    getEvent: getEventMock,
}));

vi.mock('@/src/parser/issue-parser', () => ({
    parseIssue: vi.fn(),
}));

vi.mock(
    '@/src/handlers/repository/provision-repository/request-validator',
    () => ({
        validateRequest: vi.fn(),
    }),
);

vi.mock('@/src/workflow/steps', () => ({
    createSteps: vi.fn(() => ({ beginStep, finishStep })),
}));

vi.mock('@/src/workflow/status-label', () => ({
    updateStatus: vi.fn(),
}));

describe('provision-repository handler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
        vi.mocked(beginStep).mockResolvedValue(undefined);
        vi.mocked(finishStep).mockResolvedValue(undefined);
        vi.mocked(parseIssue).mockReturnValue({ name: 'new-repo' });
        vi.mocked(validateRequest).mockResolvedValue(undefined);
        vi.mocked(updateStatus).mockResolvedValue(undefined);
    });

    it('should run all steps: verify issue, validate request and provision repository', async () => {
        await handle(createGithubEvent());

        expect(beginStep).toHaveBeenNthCalledWith(1, 'verify-issue');
        expect(beginStep).toHaveBeenNthCalledWith(
            2,
            'provision-repository-request-checks',
        );
        expect(beginStep).toHaveBeenNthCalledWith(3, 'provision-repository');

        expect(parseIssue).toHaveBeenCalledWith('issue body');
        expect(AppContext.getInstance().request).toEqual({
            type: 'repository/provision-repository',
            requestId: 'R-1',
            payload: { name: 'new-repo' },
        });
        expect(logger.info).toHaveBeenCalledWith('Handling issue #1');
        expect(validateRequest).toHaveBeenCalledWith({
            name: 'new-repo',
        });
        expect(finishStep).toHaveBeenNthCalledWith(1, 'verify-issue');
        expect(finishStep).toHaveBeenNthCalledWith(
            2,
            'provision-repository-request-checks',
        );
        expect(updateStatus).toHaveBeenCalledWith(1, StatusLabel.IN_PROGRESS);
        expect(finishStep).toHaveBeenNthCalledWith(3, 'provision-repository');
    });

    it('should throw when the issue body is missing', async () => {
        const event = {
            ...createGithubEvent(),
            issue: { ...createGithubEvent().issue, body: undefined },
        } as unknown as GithubEvent;

        await expect(handle(event)).rejects.toThrow('issueBody not found');

        expect(beginStep).toHaveBeenCalledWith('verify-issue');
        expect(logger.error).toHaveBeenCalledWith(
            'Issue Body is empty or does not exists',
        );
        expect(finishStep).not.toHaveBeenCalled();
    });

    it('should propagate parsing errors', async () => {
        vi.mocked(parseIssue).mockImplementation(() => {
            throw new Error('invalid body');
        });

        await expect(handle(createGithubEvent())).rejects.toThrow(
            'invalid body',
        );

        expect(finishStep).not.toHaveBeenCalled();
    });

    it('should propagate validation errors before provisioning', async () => {
        vi.mocked(validateRequest).mockRejectedValue(
            new Error('Repository new-repo already exists'),
        );

        await expect(handle(createGithubEvent())).rejects.toThrow(
            'Repository new-repo already exists',
        );

        expect(finishStep).toHaveBeenCalledTimes(1);
        expect(beginStep).not.toHaveBeenCalledWith('provision-repository');
        expect(updateStatus).not.toHaveBeenCalled();
    });
});
