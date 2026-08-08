import { AppContext } from '../../src/context/app-context';
import { addCommentToIssue } from '../../src/helpers/github/issues';
import { renderSummary } from '../../src/workflow/render';
import { postSummaryComment } from '../../src/workflow/summary-comment';
import { createGithubEvent } from '../fixtures/github-event';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

vi.mock('../../src/helpers/github/events', () => ({
    getEvent: getEventMock,
}));

vi.mock('../../src/helpers/github/issues', () => ({
    addCommentToIssue: vi.fn(),
}));

vi.mock('../../src/workflow/render', () => ({
    renderSummary: vi.fn(),
}));

describe('postSummaryComment', () => {
    beforeEach(() => {
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();

        vi.mocked(renderSummary).mockReturnValue('summary body');
        vi.mocked(addCommentToIssue).mockResolvedValue(42);
    });

    it('should post a new summary comment to the issue', async () => {
        await postSummaryComment();

        expect(renderSummary).toHaveBeenCalledWith(AppContext.getInstance());
        expect(addCommentToIssue).toHaveBeenCalledWith({
            issueNumber: 1,
            comment: 'summary body',
        });
    });
});
