import { checkRepoExists } from '@/src/helpers/github/repository';
import { logger } from '@/src/utils/logger';
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
        logger.error(errorMessage);
        throw new Error(errorMessage);
    }

    const isRepoExists = await checkRepoExists(parsed.data.name);

    if (isRepoExists) {
        logger.error(`Repository ${parsed.data.name} already exists`);
        throw new Error(`Repository ${parsed.data.name} already exists`);
    }
};
