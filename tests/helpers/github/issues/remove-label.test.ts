import { AppContext } from '@/src/context/app-context';
import { removeLabelFromIssue } from '@/src/helpers/github/issues/remove-label';
import { logger } from '@/src/utils/logger';
import type { RemoveLabelResponse } from '@/src/types';
import { RequestError } from 'octokit';
import type { Label } from '@octokit/webhooks-types';
import { createGithubEvent } from '../../../fixtures/github-event';
import { mockOctokitClient } from '@/tests/fixtures/octokit-client';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

vi.mock('@/src/helpers/github/events', () => ({
    getEvent: getEventMock,
}));

const removeLabelMock = vi.fn();

mockOctokitClient({ issues: { removeLabel: removeLabelMock } });

describe('removeLabelFromIssue tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
        removeLabelMock.mockResolvedValue({
            status: 200,
        } as RemoveLabelResponse);
    });

    it('should remove label from the issue successfully', async () => {
        await removeLabelFromIssue({
            issueNumber: 10,
            label: { name: 'bug' } as Label,
        });

        expect(logger.info).toHaveBeenCalledWith(
            'Removing bug label from issue: john-doe/test-repo#10',
        );

        expect(removeLabelMock).toHaveBeenCalledWith({
            repo: 'test-repo',
            issue_number: 10,
            owner: 'john-doe',
            name: 'bug',
        });

        expect(logger.info).toHaveBeenCalledWith(
            'Removed bug label from issue: john-doe/test-repo#10',
        );
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('should log & return if label not found for removal', async () => {
        const error: RequestError = new RequestError('Not Found', 404, {
            request: {
                method: 'DELETE',
                url: '/repos/john-doe/test-repo/issues/10/labels/bug',
                headers: {},
            },
        });

        removeLabelMock.mockRejectedValue(error);

        await removeLabelFromIssue({
            issueNumber: 10,
            label: { name: 'unknown-label' } as Label,
        });

        expect(logger.info).toHaveBeenCalledWith(
            'Removing unknown-label label from issue: john-doe/test-repo#10',
        );

        expect(logger.info).toHaveBeenCalledWith(
            'Label not found on issue. skipping the removeLabel',
        );

        expect(logger.error).not.toHaveBeenCalled();
    });

    it('should throw error if there is no sufficient permission for removeLabel', async () => {
        const error: RequestError = new RequestError(
            'Insufficient Permission',
            401,
            {
                request: {
                    method: 'DELETE',
                    url: '/repos/john-doe/test-repo/issues/10/labels/bug',
                    headers: {},
                },
            },
        );

        removeLabelMock.mockRejectedValue(error);

        await expect(
            removeLabelFromIssue({
                issueNumber: 10,
                label: { name: 'bug' } as Label,
            }),
        ).rejects.toThrow(error);

        expect(logger.info).toHaveBeenCalledWith(
            'Removing bug label from issue: john-doe/test-repo#10',
        );

        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                err: expect.objectContaining({
                    message: 'Insufficient Permission',
                }),
            }),
            'Failed to remove bug label from issue: john-doe/test-repo#10',
        );
    });

    it('should throw error if failed to remove label due to network issue', async () => {
        const error = new Error('Network issue');

        removeLabelMock.mockRejectedValue(error);

        await expect(
            removeLabelFromIssue({
                issueNumber: 10,
                label: { name: 'bug' } as Label,
            }),
        ).rejects.toThrow(error.message);

        expect(logger.info).toHaveBeenCalledWith(
            'Removing bug label from issue: john-doe/test-repo#10',
        );

        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                err: expect.objectContaining({ message: 'Network issue' }),
            }),
            'Failed to remove bug label from issue: john-doe/test-repo#10',
        );
    });
});
