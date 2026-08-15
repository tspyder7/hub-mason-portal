import { readFileSync } from 'fs';
import { join } from 'path';
import { cwd } from 'process';
import { getIssueTemplate } from '@/src/config/issue-template.config';
import { logger } from '@/src/utils/logger';

vi.mock('fs');

describe('getIssueTemplate', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('should return the template file contents for a known request type', () => {
        const ymlTemplate = 'name: Request New Repository\n';

        vi.mocked(readFileSync).mockReturnValue(ymlTemplate);

        const result = getIssueTemplate('repository/provision-repository');

        expect(readFileSync).toHaveBeenCalledWith(
            join(
                cwd(),
                '.github',
                'ISSUE_TEMPLATE',
                'repo-provisioning-request.yml',
            ),
            'utf-8',
        );
        expect(result).toBe(ymlTemplate);
    });

    it('should throw when the request type cannot be resolved to a template', () => {
        expect(() => getIssueTemplate('unknown/request')).toThrow(
            'Unable to resolve template-id',
        );
        expect(logger.error).toHaveBeenCalledWith(
            'Unable to resolve template id using request type: unknown/request',
        );
    });
});
