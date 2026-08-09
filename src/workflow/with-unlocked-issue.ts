import {
    getIssueLockState,
    lockIssue,
    unlockIssue,
} from '../helpers/github/issues';
import type { IssueLockReason } from '../types';

export const withUnlockedIssue = async <T>(
    issueNumber: number,
    fn: () => Promise<T>,
): Promise<T> => {
    const { locked, activeLockReason } = await getIssueLockState(issueNumber);

    if (!locked) {
        return fn();
    }

    await unlockIssue({ issueNumber });

    try {
        return await fn();
    } finally {
        await lockIssue({
            issueNumber,
            lockReason: (activeLockReason ?? undefined) as
                IssueLockReason | undefined,
        });
    }
};
