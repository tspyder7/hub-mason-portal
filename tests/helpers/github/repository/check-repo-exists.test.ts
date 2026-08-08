import * as core from '@actions/core';
import type { Repository } from '@octokit/webhooks-types';
import { RequestError } from 'octokit';
import { AppContext } from '../../../../src/context/app-context';
import { OctokitClient } from '../../../../src/helpers/github/client/octokit-client';
import { checkRepoExists } from '../../../../src/helpers/github/repository';
import { createGithubEvent } from '../../../fixtures/github-event';

const { getEventMock } = vi.hoisted(() => ({
    getEventMock: vi.fn(),
}));

vi.mock('../../../../src/helpers/github/events', () => ({
    getEvent: getEventMock,
}));

const reposGetMock = vi.fn();

vi.mock('@actions/core', () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
}));

vi.spyOn(OctokitClient, 'getInstance').mockReturnValue({
    rest: {
        repos: {
            get: reposGetMock,
        },
    },
} as never);

const repository = { name: 'test-repo' } as Repository;

describe('checkRepoExists tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
        reposGetMock.mockResolvedValue({ data: repository });
    });

    afterAll(() => {
        vi.resetAllMocks();
    });

    it('should return true when repository exists', async () => {
        await expect(
            checkRepoExists(repository.name, 'other-user'),
        ).resolves.toBe(true);

        expect(core.info).toHaveBeenCalledWith(
            'Checking if repository other-user/test-repo exists',
        );
        expect(core.info).toHaveBeenCalledWith(
            'Repository other-user/test-repo exists',
        );
        expect(reposGetMock).toHaveBeenCalledWith({
            owner: 'other-user',
            repo: 'test-repo',
        });
    });

    it('should check repository exists in current user account (when owner name is not passed)', async () => {
        await expect(checkRepoExists('new-repo')).resolves.toBe(true);

        expect(core.info).toHaveBeenCalledWith(
            'Checking if repository john-doe/new-repo exists',
        );
        expect(core.info).toHaveBeenCalledWith(
            'Repository john-doe/new-repo exists',
        );
        expect(reposGetMock).toHaveBeenCalledWith({
            owner: 'john-doe',
            repo: 'new-repo',
        });
    });

    it('should return false when the repository is not found', async () => {
        const error = new RequestError('Not Found', 404, {
            request: {
                method: 'GET',
                url: '/repos/john-doe/test-repo',
                headers: {},
            },
        });

        reposGetMock.mockRejectedValue(error);

        await expect(checkRepoExists(repository.name)).resolves.toBe(false);

        expect(core.info).toHaveBeenCalledWith(
            'Checking if repository john-doe/test-repo exists',
        );
        expect(core.info).toHaveBeenCalledWith(
            'Repository john-doe/test-repo does not exist',
        );
        expect(core.error).not.toHaveBeenCalled();
    });

    it('should throw the error if the repository check fails', async () => {
        const error = new RequestError('Insufficient Permission', 401, {
            request: {
                method: 'GET',
                url: '/repos/john-doe/test-repo',
                headers: {},
            },
        });

        reposGetMock.mockRejectedValue(error);

        await expect(checkRepoExists(repository.name)).rejects.toThrow(error);

        expect(core.error).toHaveBeenCalledWith(
            'Failed to check if repository john-doe/test-repo exists',
        );
        expect(core.debug).toHaveBeenCalledOnce();
    });

    it('should throw the error on any other non-request error', async () => {
        reposGetMock.mockRejectedValue(new Error('Network issue'));

        await expect(checkRepoExists(repository.name)).rejects.toThrow(
            'Network issue',
        );

        expect(core.error).toHaveBeenCalledWith(
            'Failed to check if repository john-doe/test-repo exists',
        );
        expect(core.debug).toHaveBeenCalledOnce();
    });
});
