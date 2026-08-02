import { Octokit } from 'octokit';
import { OctokitClient } from '../../../../src/helpers/github/client/octokit-client';

vi.mock('octokit', () => ({
    Octokit: vi.fn(),
}));

describe('octokit-client tests', () => {
    beforeEach(() => {
        vi.stubEnv('HUB_MASON_APP_TOKEN', 'test-secret-token');
        (OctokitClient as unknown as { instance: null }).instance = null;
        null;
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();
    });

    it('should return Octokit client instance', () => {
        const client = OctokitClient.getInstance();

        expect(Octokit).toHaveBeenCalledOnce();
        expect(Octokit).toHaveBeenCalledWith({
            auth: 'test-secret-token',
        });
        expect(client).toBeDefined();
    });

    it('should throw error when HUB_MASON_APP_TOKEN is not set', () => {
        delete process.env['HUB_MASON_APP_TOKEN'];

        expect(() => OctokitClient.getInstance()).toThrow(
            'Missing required environment variable: HUB_MASON_APP_TOKEN',
        );
    });

    it('should return same client on subsequent initialization', () => {
        const client1 = OctokitClient.getInstance();
        const client2 = OctokitClient.getInstance();

        expect(Octokit).toHaveBeenCalledOnce();
        expect(Octokit).toHaveBeenCalledWith({
            auth: 'test-secret-token',
        });
        expect(client1).toBe(client2);
    });
});
