import * as core from '@actions/core';
import { checkRepoExists } from '../../../helpers/github/repository';
import { z } from 'zod';
import type { ProvisionRepositoryRequest } from './type';

const provisionRepositoryRequestSchema = z.object({
    name: z
        .string()
        .min(1, 'Repository name is required')
        .min(3, 'Repository name must be greater than 2 characters')
        .regex(/^\S+$/, 'Repository name should not contain empty spaces'),
});

export const validateRequest = async (
    request: ProvisionRepositoryRequest,
): Promise<void> => {
    const parsed = provisionRepositoryRequestSchema.safeParse(request);

    if (!parsed.success) {
        const errorMessage = parsed.error.issues[0]!.message;
        core.error(errorMessage);
        throw new Error(errorMessage);
    }

    const isRepoExists = await checkRepoExists(parsed.data.name);

    if (isRepoExists) {
        core.error(`Repository ${parsed.data.name} already exists`);
        throw new Error(`Repository ${parsed.data.name} already exists`);
    }
};
