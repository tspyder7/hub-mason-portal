import * as core from '@actions/core';
import { serializeError } from 'serialize-error';
import { AppContext } from '../../../context/app-context';
import type { LockIssueInput } from '../../../types';
import { OctokitClient } from '../client/octokit-client';

export const lockIssue = async (input: LockIssueInput) => {
    const { issueNumber, lockReason = 'resolved' } = input;
    const {
        github: { repo, owner },
    } = AppContext.getInstance();

    try {
        core.info(`Locking issue: ${owner}/${repo}#${issueNumber}`);

        const client = OctokitClient.getInstance();

        await client.rest.issues.lock({
            issue_number: issueNumber,
            owner,
            repo,
            lock_reason: lockReason,
        });

        core.info(`Locked issue: ${owner}/${repo}#${issueNumber}`);
    } catch (err) {
        core.error(`Failed to lock issue: ${owner}/${repo}#${issueNumber}`);
        core.debug(`[Error]: ${JSON.stringify(serializeError(err))}`);

        throw err;
    }
};
