import { logger } from 'hub-mason-core/utils/logger';

import { AppContext } from '@/src/context/app-context';
import { handle } from '@/src/handlers/repository/provision-repository/handler';
import { createLifecycle } from '@/src/handlers/repository/provision-repository/lifecycle';
import { validateRequest } from '@/src/handlers/repository/provision-repository/request-validator';
import { Step } from '@/src/handlers/repository/provision-repository/steps';
import { parseIssue } from '@/src/parser/issue-parser';
import { StatusLabel } from '@/src/utils/constants';
import { updateStatus } from '@/src/workflow/portal-reporter';

import { createGithubEvent } from '../../../fixtures/github-event';

import type { GithubEvent, HandlerContext } from '@/src/types/context';
const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));
const { onTransitionMock } = vi.hoisted(() => ({
    onTransitionMock: vi.fn(),
}));

vi.mock('hub-mason-core/github/event', () => ({
    getEvent: getEventMock,
}));

vi.mock('hub-mason-core/adapters/github/comment-reporter', () => ({
    createGithubCommentReporter: vi.fn(() => ({
        onTransition: onTransitionMock,
    })),
    postSummaryComment: vi.fn(),
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

vi.mock('@/src/workflow/portal-reporter', async (importOriginal) => {
    const original =
        await importOriginal<typeof import('@/src/workflow/portal-reporter')>();

    return {
        ...original,
        updateStatus: vi.fn(),
    };
});

const createContext = (): HandlerContext => ({
    lifecycle: createLifecycle(),
});

describe('provision-repository handler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
        onTransitionMock.mockResolvedValue(undefined);
        vi.mocked(parseIssue).mockReturnValue({ name: 'new-repo' });
        vi.mocked(validateRequest).mockResolvedValue(undefined);
        vi.mocked(updateStatus).mockResolvedValue(undefined);
    });

    it('should run all steps: verify issue, validate request and provision repository', async () => {
        const context = createContext();

        await handle(createGithubEvent(), context);

        expect(
            context.lifecycle.steps.every(
                ({ status }) => status === 'completed',
            ),
        ).toBe(true);
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
        expect(updateStatus).toHaveBeenCalledWith(1, StatusLabel.IN_PROGRESS);
    });

    it('should throw when the issue body is missing', async () => {
        const context = createContext();
        const event = {
            ...createGithubEvent(),
            issue: { ...createGithubEvent().issue, body: undefined },
        } as unknown as GithubEvent;

        await expect(handle(event, context)).rejects.toThrow(
            'issueBody not found',
        );

        expect(logger.error).toHaveBeenCalledWith(
            'Issue Body is empty or does not exists',
        );
        expect(
            context.lifecycle.steps.find(({ id }) => id === Step.VERIFY_ISSUE),
        ).toMatchObject({ status: 'in-progress' });
    });

    it('should propagate parsing errors', async () => {
        vi.mocked(parseIssue).mockImplementation(() => {
            throw new Error('invalid body');
        });

        await expect(
            handle(createGithubEvent(), createContext()),
        ).rejects.toThrow('invalid body');
    });

    it('should propagate validation errors before provisioning', async () => {
        vi.mocked(validateRequest).mockRejectedValue(
            new Error('Repository new-repo already exists'),
        );
        const context = createContext();

        await expect(handle(createGithubEvent(), context)).rejects.toThrow(
            'Repository new-repo already exists',
        );

        expect(
            context.lifecycle.steps.find(({ id }) => id === Step.VERIFY_ISSUE),
        ).toMatchObject({ status: 'completed' });
        expect(
            context.lifecycle.steps.find(
                ({ id }) => id === Step.PROVISION_REPOSITORY,
            ),
        ).toMatchObject({ status: 'pending' });
        expect(updateStatus).not.toHaveBeenCalled();
    });
});
