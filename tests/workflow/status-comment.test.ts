import { AppContext } from '@/src/context/app-context';
import {
    addCommentToIssue,
    updateCommentOnIssue,
} from '@/src/helpers/github/issues';
import { upsertStatusComment } from '@/src/workflow/status-comment';
import { renderStatusComment } from '@/src/workflow/render';
import { withUnlockedIssue } from '@/src/workflow/with-unlocked-issue';
import { createGithubEvent } from '../fixtures/github-event';

const { getEventMock } = vi.hoisted(() => ({ getEventMock: vi.fn() }));

vi.mock('@/src/helpers/github/events', () => ({
    getEvent: getEventMock,
}));

vi.mock('@/src/helpers/github/issues', () => ({
    addCommentToIssue: vi.fn(),
    updateCommentOnIssue: vi.fn(),
}));

vi.mock('@/src/workflow/render', () => ({
    renderStatusComment: vi.fn(),
}));

vi.mock('@/src/workflow/with-unlocked-issue', () => ({
    withUnlockedIssue: vi.fn(),
}));

describe('upsertStatusComment', () => {
    beforeEach(() => {
        AppContext.reset();
        getEventMock.mockReturnValue(createGithubEvent());
        AppContext.getInstance();

        vi.mocked(renderStatusComment).mockReturnValue('comment body');
        vi.mocked(addCommentToIssue).mockResolvedValue(42);
        vi.mocked(updateCommentOnIssue).mockResolvedValue(undefined);
        vi.mocked(withUnlockedIssue).mockImplementation((_, fn) => fn());
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should create a new comment and store its id when no comment exists yet', async () => {
        await upsertStatusComment();

        expect(withUnlockedIssue).toHaveBeenCalledWith(1, expect.any(Function));
        expect(renderStatusComment).toHaveBeenCalledWith(
            AppContext.getInstance(),
        );
        expect(addCommentToIssue).toHaveBeenCalledWith({
            issueNumber: 1,
            comment: 'comment body',
        });
        expect(updateCommentOnIssue).not.toHaveBeenCalled();
        expect(AppContext.getInstance().statusCommentId).toBe(42);
    });

    it('should update the existing comment when a comment id is present', async () => {
        AppContext.getInstance().setStatusCommentId(7);

        await upsertStatusComment();

        expect(updateCommentOnIssue).toHaveBeenCalledWith({
            commentId: 7,
            comment: 'comment body',
        });
        expect(addCommentToIssue).not.toHaveBeenCalled();
        expect(AppContext.getInstance().statusCommentId).toBe(7);
    });
});
