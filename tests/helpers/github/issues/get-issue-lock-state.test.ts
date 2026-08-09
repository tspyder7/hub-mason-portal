import { AppContext } from '@/src/context/app-context';
import { getIssueLockState } from '@/src/helpers/github/issues/get-issue-lock-state';
import { logger } from '@/src/utils/logger';
import { createGithubEvent } from '../../../fixtures/github-event';
import { mockOctokitClient } from '@/tests/fixtures/octokit-client';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

vi.mock('@/src/helpers/github/events', () => ({
    getEvent: getEventMock,
}));

const getMock = vi.fn();

mockOctokitClient({ issues: { get: getMock } });

describe('getIssueLockState tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
    });

    it('should return lock state of a locked issue', async () => {
        getMock.mockResolvedValue({
            data: { locked: true, active_lock_reason: 'resolved' },
        });

        const state = await getIssueLockState(10);

        expect(getMock).toHaveBeenCalledWith({
            repo: 'test-repo',
            issue_number: 10,
            owner: 'john-doe',
        });
        expect(state).toEqual({
            locked: true,
            activeLockReason: 'resolved',
        });

        expect(logger.info).toHaveBeenCalledWith(
            'Fetched lock state of issue: john-doe/test-repo#10 (locked: true)',
        );
    });

    it('should return lock state of an unlocked issue without a reason', async () => {
        getMock.mockResolvedValue({
            data: { locked: false, active_lock_reason: null },
        });

        const state = await getIssueLockState(10);

        expect(state).toEqual({
            locked: false,
            activeLockReason: null,
        });
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('should throw error if failed to fetch the issue', async () => {
        const error = new Error('Network issue');

        getMock.mockRejectedValue(error);

        await expect(getIssueLockState(10)).rejects.toThrow(error.message);

        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                err: expect.objectContaining({ message: 'Network issue' }),
            }),
            'Failed to fetch lock state of issue: john-doe/test-repo#10',
        );
    });
});
