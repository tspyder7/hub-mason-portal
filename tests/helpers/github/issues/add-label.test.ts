import * as core from '@actions/core';
import { AppContext } from '../../../../src/context/app-context';
import { OctokitClient } from '../../../../src/helpers/github/client/octokit-client';
import { addLabelToIssue } from '../../../../src/helpers/github/issues';
import { createLabelInRepo } from '../../../../src/helpers/github/repository/create-label';
import type { Label } from '@octokit/webhooks-types';
import { createGithubEvent } from '../../../fixtures/github-event';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

vi.mock('../../../../src/helpers/github/events', () => ({
    getEvent: getEventMock,
}));

vi.mock('../../../../src/helpers/github/repository/create-label', () => ({
    createLabelInRepo: vi.fn(),
}));

vi.mock('@actions/core', () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
}));

const addLabelsMock = vi.fn();

vi.spyOn(OctokitClient, 'getInstance').mockReturnValue({
    rest: {
        issues: {
            addLabels: addLabelsMock,
        },
    },
} as never);

describe('addLabelToIssue tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
        addLabelsMock.mockResolvedValue(undefined);
        vi.mocked(createLabelInRepo).mockResolvedValue(undefined);
    });

    afterAll(() => {
        vi.resetAllMocks();
    });

    it('should create label if not exists and add it to the issue', async () => {
        await addLabelToIssue({
            issueNumber: 10,
            label: { name: 'bug' } as Label,
        });

        expect(core.info).toHaveBeenCalledWith(
            'Adding bug label to issue: john-doe/test-repo#10',
        );

        expect(createLabelInRepo).toHaveBeenCalledWith({ name: 'bug' });

        expect(addLabelsMock).toHaveBeenCalledWith({
            issue_number: 10,
            labels: ['bug'],
            owner: 'john-doe',
            repo: 'test-repo',
        });

        expect(core.info).toHaveBeenCalledWith(
            'Added bug label to issue: john-doe/test-repo#10',
        );
        expect(core.error).not.toHaveBeenCalled();
    });

    it('should throw error if failed to add the label to the issue', async () => {
        addLabelsMock.mockRejectedValueOnce(new Error('Network error'));

        await expect(
            addLabelToIssue({
                issueNumber: 10,
                label: { name: 'bug' } as Label,
            }),
        ).rejects.toThrow('Network error');

        expect(core.error).toHaveBeenCalledWith(
            'Failed to add bug label to issue: john-doe/test-repo#10',
        );
        expect(core.debug).toHaveBeenCalledOnce();
    });

    it('should throw error if failed to create the label', async () => {
        vi.mocked(createLabelInRepo).mockRejectedValueOnce(
            new Error('Failed to create label'),
        );

        await expect(
            addLabelToIssue({
                issueNumber: 10,
                label: { name: 'bug' } as Label,
            }),
        ).rejects.toThrow('Failed to create label');

        expect(addLabelsMock).not.toHaveBeenCalled();
        expect(core.error).toHaveBeenCalledWith(
            'Failed to add bug label to issue: john-doe/test-repo#10',
        );
        expect(core.debug).toHaveBeenCalledOnce();
    });
});
