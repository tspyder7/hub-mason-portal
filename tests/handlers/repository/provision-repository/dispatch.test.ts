import { dispatchWorkflow } from 'hub-mason-core/github/actions/dispatch-workflow';
import { logger } from 'hub-mason-core/utils/logger';

import { AppContext } from '@/src/context/app-context';
import {
    dispatchConfig,
    dispatchProvisionRepository,
} from '@/src/handlers/repository/provision-repository/dispatch';
import { createLifecycle } from '@/src/handlers/repository/provision-repository/lifecycle';

import { createGithubEvent } from '../../../fixtures/github-event';

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

vi.mock('hub-mason-core/github/actions/dispatch-workflow', () => ({
    dispatchWorkflow: vi.fn(),
}));

describe('provision-repository dispatch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
        onTransitionMock.mockResolvedValue(undefined);
        vi.mocked(dispatchWorkflow).mockResolvedValue(undefined);
        vi.stubEnv('HUB_MASON_WORKFLOW_SECRET_KEY', 'test-secret');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('dispatches provision workflow with signed context and portal locator', async () => {
        const lifecycle = createLifecycle();
        const request = {
            name: 'new-repo',
            description: 'test repo',
            visibility: ['private'],
            topics: 'test',
        };

        await dispatchProvisionRepository(request, lifecycle);

        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining(
                `Dispatching ${dispatchConfig.workflowId} for request R-1`,
            ),
        );
        expect(dispatchWorkflow).toHaveBeenCalledTimes(1);

        const [input, repository] = vi.mocked(dispatchWorkflow).mock.calls[0]!;

        expect(input.workflowId).toBe(dispatchConfig.workflowId);
        expect(input.ref).toBe(dispatchConfig.ref);
        expect(repository).toEqual({
            owner: 'john-doe',
            repo: dispatchConfig.repo,
        });

        const parsedRequest = JSON.parse(input.inputs?.['request'] as string);

        expect(parsedRequest).toEqual(request);

        const parsedContext = JSON.parse(input.inputs?.['context'] as string);

        expect(parsedContext.requestId).toBe('R-1');
        expect(parsedContext.requestType).toBe(
            'repository/provision-repository',
        );
        expect(parsedContext.signature).toEqual(expect.any(String));
        expect(parsedContext.issuedAt).toEqual(expect.any(String));
        expect(parsedContext.actor).toBe('hub-mason-bot');
        expect(parsedContext.lifecycleSnapshot.meta.requestId).toBe('R-1');
        expect(parsedContext.portal).toEqual({
            owner: 'john-doe',
            repo: 'test-repo',
            issueNumber: 1,
            statusCommentId: null,
        });
    });

    it('includes status comment id in portal locator when set', async () => {
        AppContext.getInstance().setStatusCommentId(42);
        const lifecycle = createLifecycle();

        await dispatchProvisionRepository(
            {
                name: 'new-repo',
                description: 'test repo',
                visibility: ['private'],
                topics: 'test',
            },
            lifecycle,
        );

        const [input] = vi.mocked(dispatchWorkflow).mock.calls[0]!;
        const parsedContext = JSON.parse(input.inputs?.['context'] as string);

        expect(parsedContext.portal.statusCommentId).toBe(42);
    });

    it('throws when secret is missing', async () => {
        vi.stubEnv('HUB_MASON_WORKFLOW_SECRET_KEY', '');
        const lifecycle = createLifecycle();

        await expect(
            dispatchProvisionRepository(
                {
                    name: 'new-repo',
                    description: 'test repo',
                    visibility: ['private'],
                    topics: 'test',
                },
                lifecycle,
            ),
        ).rejects.toThrow(
            'Missing required environment variable: HUB_MASON_WORKFLOW_SECRET_KEY',
        );
        expect(dispatchWorkflow).not.toHaveBeenCalled();
    });
});
