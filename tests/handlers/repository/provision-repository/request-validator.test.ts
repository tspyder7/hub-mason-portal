import { checkRepoExists } from '@/src/helpers/github/repository';
import { validateRequest } from '@/src/handlers/repository/provision-repository/request-validator';
import { logger } from '@/src/utils/logger';
import type { ProvisionRepositoryRequest } from '@/src/handlers/repository/provision-repository/type';

vi.mock('@/src/helpers/github/repository', () => ({
    checkRepoExists: vi.fn(),
}));

const mockProvisionRepoRequest: ProvisionRepositoryRequest = {
    name: 'test-name',
    description: 'test-description',
    visibility: ['private'],
    topics: 'topic1 topic2',
};

describe('validateRequest', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(checkRepoExists).mockResolvedValue(false);
    });

    it('should throw when the name is empty', async () => {
        await expect(
            validateRequest({ ...mockProvisionRepoRequest, name: '' }),
        ).rejects.toThrow('Repository name is required');
    });

    it('should throw when the name is not greater than 2 characters', async () => {
        await expect(
            validateRequest({ ...mockProvisionRepoRequest, name: 'ab' }),
        ).rejects.toThrow('Repository name must be greater than 2 characters');
    });

    it('should throw when the name contains empty spaces', async () => {
        await expect(
            validateRequest({ ...mockProvisionRepoRequest, name: 'my repo' }),
        ).rejects.toThrow('Repository name should not contain empty spaces');
    });

    it('should log the validation error and skip the existence check', async () => {
        await expect(
            validateRequest({ ...mockProvisionRepoRequest, name: 'a b' }),
        ).rejects.toThrow('Repository name should not contain empty spaces');

        expect(logger.error).toHaveBeenCalledWith(
            'Repository name should not contain empty spaces',
        );
        expect(checkRepoExists).not.toHaveBeenCalled();
    });

    it('should allow names with numbers and hyphens and pass when the repository does not exist', async () => {
        await expect(
            validateRequest({
                ...mockProvisionRepoRequest,
                name: 'identity-2fa',
            }),
        ).resolves.toBeUndefined();

        await expect(
            validateRequest({ ...mockProvisionRepoRequest, name: 'repo123' }),
        ).resolves.toBeUndefined();

        expect(checkRepoExists).toHaveBeenCalledWith('identity-2fa');
        expect(checkRepoExists).toHaveBeenCalledWith('repo123');
    });

    it('should throw when the repository already exists', async () => {
        vi.mocked(checkRepoExists).mockResolvedValue(true);

        await expect(
            validateRequest({
                ...mockProvisionRepoRequest,
                name: 'existing-repo',
            }),
        ).rejects.toThrow('Repository existing-repo already exists');

        expect(checkRepoExists).toHaveBeenCalledWith('existing-repo');
        expect(logger.error).toHaveBeenCalledWith(
            'Repository existing-repo already exists',
        );
    });
});
