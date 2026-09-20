import { checkRepoExists as checkRepoExistsCore } from 'hub-mason-core/github/repository';
import { logger } from 'hub-mason-core/utils/logger';
import { z } from 'zod';
import { AppContext } from '@/src/context/app-context';
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

    const { repository } = AppContext.getInstance();

    const isRepoExists = await checkRepoExistsCore({
        repo: parsed.data.name,
        owner: repository.owner,
    });

    if (isRepoExists) {
        logger.error(`Repository ${parsed.data.name} already exists`);
        throw new Error(`Repository ${parsed.data.name} already exists`);
    }
};
