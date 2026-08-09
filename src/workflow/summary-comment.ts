import { AppContext } from '../context/app-context';
import { addCommentToIssue } from '../helpers/github/issues';
import { renderSummary } from './render';
import { withUnlockedIssue } from './with-unlocked-issue';

export const postSummaryComment = async (): Promise<void> => {
    const context = AppContext.getInstance();

    await withUnlockedIssue(context.issue.number, async () => {
        await addCommentToIssue({
            issueNumber: context.issue.number,
            comment: renderSummary(context),
        });
    });
};
