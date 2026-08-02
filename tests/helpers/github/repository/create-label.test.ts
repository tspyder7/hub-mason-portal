import * as core from '@actions/core';
import type { Label } from '@octokit/webhooks-types';
import { AppContext } from '../../../../src/context/app-context';
import { createLabelInRepo } from '../../../../src/helpers/github/repository';
import { getLabelsFromRepo } from '../../../../src/helpers/github/repository/get-labels';
import { OctokitClient } from '../../../../src/helpers/github/client/octokit-client';
import { createGithubEvent } from '../../../fixtures/github-event';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

vi.mock('../../../../src/helpers/github/events', () => ({
    getEvent: getEventMock,
}));

const githubCreateLabelMock = vi.fn();

vi.mock('../../../../src/helpers/github/repository/get-labels');

vi.mock('@actions/core', () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
}));

vi.spyOn(OctokitClient, 'getInstance').mockReturnValue({
    rest: {
        issues: {
            createLabel: githubCreateLabelMock,
        },
    },
} as never);

const repoLabels = [{ name: 'bug' }, { name: 'test' }] as Label[];

describe('createLabelInRepo tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
        githubCreateLabelMock.mockResolvedValue(undefined);
        vi.mocked(getLabelsFromRepo).mockResolvedValue(repoLabels);
    });

    afterAll(() => {
        vi.resetAllMocks();
    });

    it('should create label in repository if not exists', async () => {
        await createLabelInRepo({ name: 'repo-request' } as Label);

        expect(githubCreateLabelMock).toHaveBeenCalledWith({
            owner: 'john-doe',
            repo: 'test-repo',
            name: 'repo-request',
            description: '',
            color: undefined,
        });
        expect(core.info).toHaveBeenCalledWith(
            'Created label in john-doe/test-repo: repo-request',
        );
    });

    it('should skip label creation if label already exists', async () => {
        vi.mocked(getLabelsFromRepo).mockResolvedValue([
            ...repoLabels,
            { name: 'repo-request' },
        ] as Label[]);

        await createLabelInRepo({ name: 'repo-request' } as Label);

        expect(githubCreateLabelMock).not.toHaveBeenCalled();
        expect(core.info).toHaveBeenCalledWith(
            'Label already exists, skipping label creation',
        );
    });

    it('should throw error if failed to create the label', async () => {
        githubCreateLabelMock.mockRejectedValueOnce(new Error('Network error'));

        await expect(
            createLabelInRepo({ name: 'repo-request' } as Label),
        ).rejects.toThrow('Network error');

        expect(core.error).toHaveBeenCalledWith(
            'Failed to create label in john-doe/test-repo',
        );
        expect(core.debug).toHaveBeenCalledOnce();
    });
});
