import * as core from '@actions/core';
import { checkRepoExists } from '../../../../src/helpers/github/repository';
import { validateRequest } from '../../../../src/handlers/repository/provision-repository/request-validator';

vi.mock('@actions/core', () => ({
    error: vi.fn(),
}));

vi.mock('../../../../src/helpers/github/repository', () => ({
    checkRepoExists: vi.fn(),
}));

describe('validateRequest', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(checkRepoExists).mockResolvedValue(false);
    });

    it('should throw when the name is empty', async () => {
        await expect(validateRequest({ name: '' })).rejects.toThrow(
            'Repository name is required',
        );
    });

    it('should throw when the name is not greater than 2 characters', async () => {
        await expect(validateRequest({ name: 'ab' })).rejects.toThrow(
            'Repository name must be greater than 2 characters',
        );
    });

    it('should throw when the name contains empty spaces', async () => {
        await expect(validateRequest({ name: 'my repo' })).rejects.toThrow(
            'Repository name should not contain empty spaces',
        );
    });

    it('should log the validation error and skip the existence check', async () => {
        await expect(validateRequest({ name: 'a b' })).rejects.toThrow(
            'Repository name should not contain empty spaces',
        );

        expect(core.error).toHaveBeenCalledWith(
            'Repository name should not contain empty spaces',
        );
        expect(checkRepoExists).not.toHaveBeenCalled();
    });

    it('should allow names with numbers and hyphens and pass when the repository does not exist', async () => {
        await expect(
            validateRequest({ name: 'identity-2fa' }),
        ).resolves.toBeUndefined();

        await expect(
            validateRequest({ name: 'repo123' }),
        ).resolves.toBeUndefined();

        expect(checkRepoExists).toHaveBeenCalledWith('identity-2fa');
        expect(checkRepoExists).toHaveBeenCalledWith('repo123');
    });

    it('should throw when the repository already exists', async () => {
        vi.mocked(checkRepoExists).mockResolvedValue(true);

        await expect(
            validateRequest({ name: 'existing-repo' }),
        ).rejects.toThrow('Repository existing-repo already exists');

        expect(checkRepoExists).toHaveBeenCalledWith('existing-repo');
        expect(core.error).toHaveBeenCalledWith(
            'Repository existing-repo already exists',
        );
    });
});
