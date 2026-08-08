import * as core from '@actions/core';
import type { Label } from '@octokit/webhooks-types';
import { AppContext } from '../../../../src/context/app-context';
import { OctokitClient } from '../../../../src/helpers/github/client/octokit-client';
import { getLabelsFromRepo } from '../../../../src/helpers/github/repository';
import { createGithubEvent } from '../../../fixtures/github-event';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

vi.mock('../../../../src/helpers/github/events', () => ({
    getEvent: getEventMock,
}));

const listLabelsForRepo = vi.fn();

vi.mock('@actions/core', () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
}));

vi.spyOn(OctokitClient, 'getInstance').mockReturnValue({
    rest: {
        issues: {
            listLabelsForRepo,
        },
    },
} as never);

const repoLabels = [{ name: 'bug' }, { name: 'test' }] as Label[];

describe('getLabelsFromRepo tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
        listLabelsForRepo.mockResolvedValue({
            data: repoLabels,
        });
    });

    afterAll(() => {
        vi.resetAllMocks();
    });

    it('should get labels from the repository', async () => {
        const result = await getLabelsFromRepo();

        expect(core.info).toHaveBeenCalledWith(
            'Fetching labels from john-doe/test-repo',
        );
        expect(core.info).toHaveBeenCalledWith(
            'Fetched labels from john-doe/test-repo: 2',
        );
        expect(result).toStrictEqual(repoLabels);
    });

    it('should throw error if failed to get the labels from repository', async () => {
        listLabelsForRepo.mockRejectedValueOnce(new Error('Network error'));

        await expect(getLabelsFromRepo()).rejects.toThrow('Network error');

        expect(core.info).toHaveBeenCalledWith(
            'Fetching labels from john-doe/test-repo',
        );
        expect(core.debug).toHaveBeenCalledOnce();
        expect(core.error).toHaveBeenCalledWith(
            'Failed to fetch labels from john-doe/test-repo',
        );
    });
});
