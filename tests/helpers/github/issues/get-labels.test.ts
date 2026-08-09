import type { Label } from '@octokit/webhooks-types';
import { AppContext } from '@/src/context/app-context';
import { getLabelsFromIssue } from '@/src/helpers/github/issues';
import { logger } from '@/src/utils/logger';
import { createGithubEvent } from '../../../fixtures/github-event';
import { mockOctokitClient } from '@/tests/fixtures/octokit-client';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

vi.mock('@/src/helpers/github/events', () => ({
    getEvent: getEventMock,
}));

const listLabelsOnIssueMock = vi.fn();

mockOctokitClient({ issues: { listLabelsOnIssue: listLabelsOnIssueMock } });

const issueLabels = [{ name: 'bug' }, { name: 'test' }] as Label[];

describe('getLabelsFromIssue tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
        listLabelsOnIssueMock.mockResolvedValue({
            data: issueLabels,
        });
    });

    afterAll(() => {
        vi.resetAllMocks();
    });

    it('should get labels from the issue', async () => {
        const result = await getLabelsFromIssue(42);

        expect(listLabelsOnIssueMock).toHaveBeenCalledWith({
            owner: 'john-doe',
            repo: 'test-repo',
            issue_number: 42,
        });
        expect(logger.info).toHaveBeenCalledWith(
            'Fetching labels from issue: john-doe/test-repo#42',
        );
        expect(logger.info).toHaveBeenCalledWith(
            'Fetched labels from issue: john-doe/test-repo#42: 2',
        );
        expect(result).toStrictEqual(issueLabels);
    });

    it('should throw error if failed to get the labels from issue', async () => {
        listLabelsOnIssueMock.mockRejectedValueOnce(new Error('Network error'));

        await expect(getLabelsFromIssue(42)).rejects.toThrow('Network error');

        expect(logger.info).toHaveBeenCalledWith(
            'Fetching labels from issue: john-doe/test-repo#42',
        );
        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                err: expect.objectContaining({ message: 'Network error' }),
            }),
            'Failed to fetch labels from issue: john-doe/test-repo#42',
        );
    });
});
