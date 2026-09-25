import { getWorkflowSecretKey } from '@/src/workflow/workflow-secret';

describe('workflow-secret', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe('getWorkflowSecretKey', () => {
        it('returns secret when env is set', () => {
            vi.stubEnv('HUB_MASON_WORKFLOW_SECRET_KEY', 'test-secret');

            expect(getWorkflowSecretKey()).toBe('test-secret');
        });

        it('throws when env is missing', () => {
            vi.stubEnv('HUB_MASON_WORKFLOW_SECRET_KEY', '');

            expect(() => getWorkflowSecretKey()).toThrow(
                'Missing required environment variable: HUB_MASON_WORKFLOW_SECRET_KEY',
            );
        });
    });
});
