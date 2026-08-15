import { AppContext } from '@/src/context/app-context';
import { getIssueTemplate } from '@/src/config/issue-template.config';
import { parseIssue } from '@/src/parser/issue-parser';
import { createGithubEvent } from '../fixtures/github-event';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

vi.mock('@/src/helpers/github/events', () => ({
    getEvent: getEventMock,
}));

vi.mock('@/src/config/issue-template.config', () => ({
    getIssueTemplate: vi.fn(),
}));

const issueBody = `
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
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();
        vi.mocked(getIssueTemplate).mockReturnValue(ymlTemplate);
    });

    it('should parse the issueBody using the template resolved from the request type', () => {
        const result = parseIssue<{
            title: string;
            description: string;
            visibility: string[];
        }>(issueBody);

        expect(getIssueTemplate).toHaveBeenCalledWith(
            'repository/provision-repository',
        );
        expect(result).toStrictEqual({
            title: 'test-repo-2',
            description: 'Test issue-resolver workflow',
            visibility: ['public'],
        });
    });

    it('should throw when the request type cannot resolve a template', () => {
        vi.mocked(getIssueTemplate).mockImplementation(() => {
            throw new Error('Unable to resolve template-id');
        });

        expect(() => parseIssue(issueBody)).toThrow(
            'Unable to resolve template-id',
        );
    });
});
