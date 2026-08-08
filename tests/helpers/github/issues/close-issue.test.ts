import * as core from '@actions/core';
import { AppContext } from '../../../../src/context/app-context';
import { OctokitClient } from '../../../../src/helpers/github/client/';
import { closeIssue } from '../../../../src/helpers/github/issues/close-issue';
import { createGithubEvent } from '../../../fixtures/github-event';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

vi.mock('../../../../src/helpers/github/events', () => ({
    getEvent: getEventMock,
}));

const updateMock = vi.fn();

vi.mock('@actions/core', () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
}));

vi.spyOn(OctokitClient, 'getInstance').mockReturnValue({
    rest: {
        issues: {
            update: updateMock,
        },
    },
} as never);

describe('closeIssue tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
        updateMock.mockResolvedValue({ status: 200 });
    });

    it('should close the issue successfully', async () => {
        await closeIssue({ issueNumber: 10 });

        expect(core.info).toHaveBeenCalledWith(
            'Closing issue: john-doe/test-repo#10',
        );

        expect(updateMock).toHaveBeenCalledWith({
            repo: 'test-repo',
            issue_number: 10,
            owner: 'john-doe',
            state: 'closed',
        });

        expect(core.info).toHaveBeenCalledWith(
            'Closed issue: john-doe/test-repo#10',
        );
        expect(core.error).not.toHaveBeenCalled();
    });

    it('should log error if failed to close the issue', async () => {
        const error = new Error('Network issue');

        updateMock.mockRejectedValue(error);

        await closeIssue({ issueNumber: 10 });

        expect(core.info).toHaveBeenCalledWith(
            'Closing issue: john-doe/test-repo#10',
        );

        expect(core.error).toHaveBeenCalledWith(
            'Failed to close issue: john-doe/test-repo#10',
        );
        expect(core.debug).toHaveBeenCalledOnce();
    });
});
