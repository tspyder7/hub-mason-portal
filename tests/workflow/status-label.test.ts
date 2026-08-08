import type { Label } from '@octokit/webhooks-types';
import { AppContext } from '../../src/context/app-context';
import {
    addLabelToIssue,
    getLabelsFromIssue,
    removeLabelFromIssue,
} from '../../src/helpers/github/issues';
import { StatusLabel } from '../../src/utils/constants';
import { logger } from '../../src/utils/logger';
import { updateStatus } from '../../src/workflow/status-label';
import { createGithubEvent } from '../fixtures/github-event';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

vi.mock('../../src/helpers/github/events', () => ({
    getEvent: getEventMock,
}));

vi.mock('../../src/helpers/github/issues', () => ({
    addLabelToIssue: vi.fn(),
    getLabelsFromIssue: vi.fn(),
    removeLabelFromIssue: vi.fn(),
}));

vi.mock('../../src/utils/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

const requestLabel = {
    name: 'repository/provision-repository',
} as Label;

describe('updateStatus tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
        vi.mocked(removeLabelFromIssue).mockResolvedValue(undefined);
        vi.mocked(addLabelToIssue).mockResolvedValue(undefined);
    });

    it('should remove the existing status label and add the new one', async () => {
        vi.mocked(getLabelsFromIssue).mockResolvedValue([StatusLabel.OPENED]);

        await updateStatus(1, StatusLabel.INITIATED);

        expect(getLabelsFromIssue).toHaveBeenCalledWith(1);
        expect(logger.info).toHaveBeenCalledWith(
            'Updating status: status:opened -> status:initiated',
        );
        expect(removeLabelFromIssue).toHaveBeenCalledWith({
            issueNumber: 1,
            label: StatusLabel.OPENED,
        });
        expect(addLabelToIssue).toHaveBeenCalledWith({
            issueNumber: 1,
            label: StatusLabel.INITIATED,
        });
        expect(logger.info).toHaveBeenCalledWith(
            'Updated status to status:initiated',
        );
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('should remove every status label present on the issue', async () => {
        vi.mocked(getLabelsFromIssue).mockResolvedValue([
            StatusLabel.OPENED,
            StatusLabel.FAILED,
        ]);

        await updateStatus(1, StatusLabel.INITIATED);

        expect(logger.info).toHaveBeenCalledWith(
            'Updating status: status:opened, status:failed -> status:initiated',
        );
        expect(removeLabelFromIssue).toHaveBeenNthCalledWith(1, {
            issueNumber: 1,
            label: StatusLabel.OPENED,
        });
        expect(removeLabelFromIssue).toHaveBeenNthCalledWith(2, {
            issueNumber: 1,
            label: StatusLabel.FAILED,
        });
        expect(addLabelToIssue).toHaveBeenCalledWith({
            issueNumber: 1,
            label: StatusLabel.INITIATED,
        });
    });

    it('should ignore non-status labels when looking for the current status', async () => {
        vi.mocked(getLabelsFromIssue).mockResolvedValue([
            requestLabel,
            StatusLabel.OPENED,
        ]);

        await updateStatus(1, StatusLabel.INITIATED);

        expect(removeLabelFromIssue).toHaveBeenCalledTimes(1);
        expect(removeLabelFromIssue).toHaveBeenCalledWith({
            issueNumber: 1,
            label: StatusLabel.OPENED,
        });
        expect(addLabelToIssue).toHaveBeenCalledWith({
            issueNumber: 1,
            label: StatusLabel.INITIATED,
        });
    });

    it('should add the status label when the issue has no status label', async () => {
        vi.mocked(getLabelsFromIssue).mockResolvedValue([requestLabel]);

        await updateStatus(1, StatusLabel.OPENED);

        expect(logger.info).toHaveBeenCalledWith(
            'Adding status label: status:opened',
        );
        expect(removeLabelFromIssue).not.toHaveBeenCalled();
        expect(addLabelToIssue).toHaveBeenCalledWith({
            issueNumber: 1,
            label: StatusLabel.OPENED,
        });
        expect(logger.info).toHaveBeenCalledWith(
            'Updated status to status:opened',
        );
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('should throw an error if removing the current status label fails', async () => {
        vi.mocked(getLabelsFromIssue).mockResolvedValue([StatusLabel.OPENED]);
        vi.mocked(removeLabelFromIssue).mockRejectedValueOnce(
            new Error('Failed to remove label'),
        );

        await expect(updateStatus(1, StatusLabel.INITIATED)).rejects.toThrow(
            'Failed to remove label',
        );

        expect(addLabelToIssue).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                err: expect.objectContaining({
                    message: 'Failed to remove label',
                }),
            }),
            'Failed to update status from status:opened to status:initiated on john-doe/test-repo#1',
        );
    });

    it('should throw an error if adding the new status label fails', async () => {
        vi.mocked(getLabelsFromIssue).mockResolvedValue([StatusLabel.OPENED]);
        vi.mocked(addLabelToIssue).mockRejectedValueOnce(
            new Error('Failed to add label'),
        );

        await expect(updateStatus(1, StatusLabel.INITIATED)).rejects.toThrow(
            'Failed to add label',
        );

        expect(removeLabelFromIssue).toHaveBeenCalledOnce();
        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                err: expect.objectContaining({
                    message: 'Failed to add label',
                }),
            }),
            'Failed to update status from status:opened to status:initiated on john-doe/test-repo#1',
        );
    });

    it('should restore the removed status labels when adding the new one fails', async () => {
        vi.mocked(getLabelsFromIssue).mockResolvedValue([
            StatusLabel.OPENED,
            StatusLabel.FAILED,
        ]);
        vi.mocked(addLabelToIssue)
            .mockRejectedValueOnce(new Error('Failed to add label'))
            .mockResolvedValueOnce(undefined);

        await expect(updateStatus(1, StatusLabel.INITIATED)).rejects.toThrow(
            'Failed to add label',
        );

        expect(addLabelToIssue).toHaveBeenNthCalledWith(1, {
            issueNumber: 1,
            label: StatusLabel.INITIATED,
        });
        expect(addLabelToIssue).toHaveBeenNthCalledWith(2, {
            issueNumber: 1,
            label: StatusLabel.OPENED,
        });
        expect(addLabelToIssue).toHaveBeenNthCalledWith(3, {
            issueNumber: 1,
            label: StatusLabel.FAILED,
        });
        expect(logger.warn).toHaveBeenCalledWith(
            'Restored previous status label: status:opened',
        );
        expect(logger.warn).toHaveBeenCalledWith(
            'Restored previous status label: status:failed',
        );
    });

    it('should throw an error if adding the status label without an existing one fails', async () => {
        vi.mocked(getLabelsFromIssue).mockResolvedValue([]);
        vi.mocked(addLabelToIssue).mockRejectedValueOnce(
            new Error('Failed to add label'),
        );

        await expect(updateStatus(1, StatusLabel.OPENED)).rejects.toThrow(
            'Failed to add label',
        );

        expect(removeLabelFromIssue).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                err: expect.objectContaining({
                    message: 'Failed to add label',
                }),
            }),
            'Failed to update status to status:opened on john-doe/test-repo#1',
        );
    });

    it('should log an error if restoring a removed status label fails', async () => {
        vi.mocked(getLabelsFromIssue).mockResolvedValue([StatusLabel.OPENED]);
        vi.mocked(addLabelToIssue)
            .mockRejectedValueOnce(new Error('Failed to add label'))
            .mockRejectedValueOnce(new Error('Failed to restore label'));

        await expect(updateStatus(1, StatusLabel.INITIATED)).rejects.toThrow(
            'Failed to add label',
        );

        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                err: expect.objectContaining({
                    message: 'Failed to restore label',
                }),
            }),
            'Failed to restore previous status label: status:opened',
        );
        expect(logger.warn).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                err: expect.objectContaining({
                    message: 'Failed to add label',
                }),
            }),
            'Failed to update status from status:opened to status:initiated on john-doe/test-repo#1',
        );
    });

    it('should throw an error if fetching the issue labels fails', async () => {
        vi.mocked(getLabelsFromIssue).mockRejectedValueOnce(
            new Error('Failed to fetch labels'),
        );

        await expect(updateStatus(1, StatusLabel.INITIATED)).rejects.toThrow(
            'Failed to fetch labels',
        );

        expect(removeLabelFromIssue).not.toHaveBeenCalled();
        expect(addLabelToIssue).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                err: expect.objectContaining({
                    message: 'Failed to fetch labels',
                }),
            }),
            'Failed to update status to status:initiated on john-doe/test-repo#1',
        );
    });
});
