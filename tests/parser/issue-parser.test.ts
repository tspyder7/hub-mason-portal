import { readFileSync } from 'fs';
import { parseIssue } from '../../src/parser/issue-parser';
import * as core from '@actions/core';

vi.mock('fs');

vi.mock('@actions/core', () => ({
    error: vi.fn(),
}));

const issueBody = `
<!-- template-id: test-request.yml -->
### Test Title
test-repo-2
### Test Description
Test issue-resolver workflow
### Test Visibility
public
`;

const ymlTemplate = `
name: Test yaml
body:
  - type: markdown
    attributes:
      value: "<!-- template-id: test-request.yml -->"

  - type: input
    id: title
    attributes:
      label: Test Title

  - type: textarea
    id: description
    attributes:
      label: Test Description

  - type: dropdown
    id: visibility
    attributes:
      label: Test Visibility
`;

describe('issue-parser tests', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.mocked(readFileSync).mockReturnValue(ymlTemplate);
    });

    it('should parse the issueBody and returns parsedBody', () => {
        const result = parseIssue<{
            title: string;
            description: string;
            visibility: string[];
        }>(issueBody);

        expect(result).toStrictEqual({
            title: 'test-repo-2',
            description: 'Test issue-resolver workflow',
            visibility: ['public'],
        });
    });

    it('should throw error if template-id not found', () => {
        expect(() =>
            parseIssue(
                issueBody.replace('<!-- template-id: test-request.yml -->', ''),
            ),
        ).toThrow('template-id not found in issueBody');

        expect(core.error).toHaveBeenCalledWith(
            'Issue body does not include template-id',
        );
    });
});
