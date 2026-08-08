import type { Label } from '@octokit/webhooks-types';
import { AppContext } from '../../../../src/context/app-context';
import { OctokitClient } from '../../../../src/helpers/github/client/octokit-client';
import { getLabelsFromIssue } from '../../../../src/helpers/github/issues';
import { logger } from '../../../../src/utils/logger';
import { createGithubEvent } from '../../../fixtures/github-event';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

vi.mock('../../../../src/helpers/github/events', () => ({
    getEvent: getEventMock,
}));

const listLabelsOnIssue = vi.fn();

vi.mock('../../../../src/utils/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

vi.spyOn(OctokitClient, 'getInstance').mockReturnValue({
    rest: {
        issues: {
            listLabelsOnIssue,
        },
    },
} as never);

const issueLabels = [{ name: 'bug' }, { name: 'test' }] as Label[];

describe('getLabelsFromIssue tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
        listLabelsOnIssue.mockResolvedValue({
            data: issueLabels,
        });
    });

    afterAll(() => {
        vi.resetAllMocks();
    });

    it('should get labels from the issue', async () => {
        const result = await getLabelsFromIssue(42);

        expect(listLabelsOnIssue).toHaveBeenCalledWith({
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
        listLabelsOnIssue.mockRejectedValueOnce(new Error('Network error'));

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
