import {
    getIssueLockState,
    lockIssue,
    unlockIssue,
} from '@/src/helpers/github/issues';
import { withUnlockedIssue } from '@/src/workflow/with-unlocked-issue';

vi.mock('@/src/helpers/github/issues', () => ({
    getIssueLockState: vi.fn(),
    lockIssue: vi.fn(),
    unlockIssue: vi.fn(),
}));

describe('withUnlockedIssue tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getIssueLockState).mockResolvedValue({
            locked: false,
            activeLockReason: null,
        });
        vi.mocked(unlockIssue).mockResolvedValue(undefined);
        vi.mocked(lockIssue).mockResolvedValue(undefined);
    });

    it('should run the callback without unlocking when issue is not locked', async () => {
        const fn = vi.fn().mockResolvedValue('result');

        const result = await withUnlockedIssue(10, fn);

        expect(result).toBe('result');
        expect(fn).toHaveBeenCalledOnce();
        expect(unlockIssue).not.toHaveBeenCalled();
        expect(lockIssue).not.toHaveBeenCalled();
    });

    it('should unlock, run the callback and re-lock with the original reason when issue is locked', async () => {
        vi.mocked(getIssueLockState).mockResolvedValue({
            locked: true,
            activeLockReason: 'too heated',
        });

        const fn = vi.fn().mockResolvedValue('result');

        const result = await withUnlockedIssue(10, fn);

        expect(result).toBe('result');
        expect(unlockIssue).toHaveBeenCalledWith({ issueNumber: 10 });
        expect(fn).toHaveBeenCalledOnce();
        expect(lockIssue).toHaveBeenCalledWith({
            issueNumber: 10,
            lockReason: 'too heated',
        });
    });

    it('should re-lock without a reason when the original lock reason is unknown', async () => {
        vi.mocked(getIssueLockState).mockResolvedValue({
            locked: true,
            activeLockReason: null,
        });

        await withUnlockedIssue(10, vi.fn().mockResolvedValue(undefined));

        expect(lockIssue).toHaveBeenCalledWith({
            issueNumber: 10,
            lockReason: undefined,
        });
    });

    it('should re-lock even when the callback throws and propagate the error', async () => {
        vi.mocked(getIssueLockState).mockResolvedValue({
            locked: true,
            activeLockReason: 'resolved',
        });

        const error = new Error('comment failed');

        await expect(
            withUnlockedIssue(10, vi.fn().mockRejectedValue(error)),
        ).rejects.toThrow(error.message);

        expect(unlockIssue).toHaveBeenCalledWith({ issueNumber: 10 });
        expect(lockIssue).toHaveBeenCalledWith({
            issueNumber: 10,
            lockReason: 'resolved',
        });
    });

    it('should not run the callback when unlocking fails and propagate the error', async () => {
        vi.mocked(getIssueLockState).mockResolvedValue({
            locked: true,
            activeLockReason: 'resolved',
        });

        const error = new Error('unlock failed');

        vi.mocked(unlockIssue).mockRejectedValue(error);

        const fn = vi.fn().mockResolvedValue(undefined);

        await expect(withUnlockedIssue(10, fn)).rejects.toThrow(error.message);

        expect(fn).not.toHaveBeenCalled();
        expect(lockIssue).not.toHaveBeenCalled();
    });

    it('should propagate the error when fetching the lock state fails', async () => {
        const error = new Error('fetch failed');

        vi.mocked(getIssueLockState).mockRejectedValue(error);

        const fn = vi.fn().mockResolvedValue(undefined);

        await expect(withUnlockedIssue(10, fn)).rejects.toThrow(error.message);

        expect(fn).not.toHaveBeenCalled();
        expect(unlockIssue).not.toHaveBeenCalled();
        expect(lockIssue).not.toHaveBeenCalled();
    });
});
