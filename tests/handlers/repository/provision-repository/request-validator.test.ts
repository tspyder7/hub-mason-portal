import { checkRepoExists } from 'hub-mason-core/github/repository';
import { logger } from 'hub-mason-core/utils/logger';

import { AppContext } from '@/src/context/app-context';
import { validateRequest } from '@/src/handlers/repository/provision-repository/request-validator';
import type { ProvisionRepositoryRequest } from '@/src/handlers/repository/provision-repository/type';

import { createGithubEvent } from '../../../fixtures/github-event';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

vi.mock('hub-mason-core/github/event', () => ({
    getEvent: getEventMock,
}));

vi.mock('hub-mason-core/github/repository', () => ({
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
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
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

        expect(checkRepoExists).toHaveBeenCalledWith({
            repo: 'identity-2fa',
            owner: 'john-doe',
        });
        expect(checkRepoExists).toHaveBeenCalledWith({
            repo: 'repo123',
            owner: 'john-doe',
        });
    });

    it('should throw when the repository already exists', async () => {
        vi.mocked(checkRepoExists).mockResolvedValue(true);

        await expect(
            validateRequest({
                ...mockProvisionRepoRequest,
                name: 'existing-repo',
            }),
        ).rejects.toThrow('Repository existing-repo already exists');

        expect(checkRepoExists).toHaveBeenCalledWith({
            repo: 'existing-repo',
            owner: 'john-doe',
        });
        expect(logger.error).toHaveBeenCalledWith(
            'Repository existing-repo already exists',
        );
    });
});
