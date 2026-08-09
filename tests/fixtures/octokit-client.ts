import { vi } from 'vitest';
import { OctokitClient } from '@/src/helpers/github/client/octokit-client';

export const mockOctokitClient = <T extends Record<string, unknown>>(
    rest: T,
) => {
    return vi
        .spyOn(OctokitClient, 'getInstance')
        .mockReturnValue({ rest } as never);
};
