import { AppContext } from '../context/app-context';
import { addCommentToIssue } from '../helpers/github/issues';
import { renderSummary } from './render';

export const postSummaryComment = async (): Promise<void> => {
    const context = AppContext.getInstance();

    await addCommentToIssue({
        issueNumber: context.issue.number,
        comment: renderSummary(context),
    });
};
