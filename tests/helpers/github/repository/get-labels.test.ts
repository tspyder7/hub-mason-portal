import type { Label } from '@octokit/webhooks-types';
import { AppContext } from '@/src/context/app-context';
import { getLabelsFromRepo } from '@/src/helpers/github/repository';
import { logger } from '@/src/utils/logger';
import { createGithubEvent } from '../../../fixtures/github-event';
import { mockOctokitClient } from '@/tests/fixtures/octokit-client';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

vi.mock('@/src/helpers/github/events', () => ({
    getEvent: getEventMock,
}));

const listLabelsForRepoMock = vi.fn();

mockOctokitClient({ issues: { listLabelsForRepo: listLabelsForRepoMock } });

const repoLabels = [{ name: 'bug' }, { name: 'test' }] as Label[];

describe('getLabelsFromRepo tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
        listLabelsForRepoMock.mockResolvedValue({
            data: repoLabels,
        });
    });

    afterAll(() => {
        vi.resetAllMocks();
    });

    it('should get labels from the repository', async () => {
        const result = await getLabelsFromRepo();

        expect(logger.info).toHaveBeenCalledWith(
            'Fetching labels from john-doe/test-repo',
        );
        expect(logger.info).toHaveBeenCalledWith(
            'Fetched labels from john-doe/test-repo: 2',
        );
        expect(result).toStrictEqual(repoLabels);
    });

    it('should throw error if failed to get the labels from repository', async () => {
        listLabelsForRepoMock.mockRejectedValueOnce(new Error('Network error'));

        await expect(getLabelsFromRepo()).rejects.toThrow('Network error');

        expect(logger.info).toHaveBeenCalledWith(
            'Fetching labels from john-doe/test-repo',
        );
        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                err: expect.objectContaining({ message: 'Network error' }),
            }),
            'Failed to fetch labels from john-doe/test-repo',
        );
    });
});
