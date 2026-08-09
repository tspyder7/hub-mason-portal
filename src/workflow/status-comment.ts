import { AppContext } from '../context/app-context';
import {
    addCommentToIssue,
    updateCommentOnIssue,
} from '../helpers/github/issues';
import { renderStatusComment } from './render';
import { withUnlockedIssue } from './with-unlocked-issue';

export const upsertStatusComment = async (): Promise<void> => {
    const context = AppContext.getInstance();

    const body = renderStatusComment(context);

    await withUnlockedIssue(context.issue.number, async () => {
        if (context.statusCommentId) {
            await updateCommentOnIssue({
                commentId: context.statusCommentId,
                comment: body,
            });

            return;
        }

        const commentId = await addCommentToIssue({
            issueNumber: context.issue.number,
            comment: body,
        });

        context.setStatusCommentId(commentId);
    });
};
