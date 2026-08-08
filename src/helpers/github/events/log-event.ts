import * as core from '@actions/core';
import type { GithubEvent } from '../../../types';

export const logEvent = (event: GithubEvent) => {
    core.startGroup('Github Event');
    core.info(`Event name: ${event.eventName}`);
    core.info(`Action: ${event.action}`);
    core.info(`Issue title: ${event.issue.title}`);
    core.info(`Issue body: ${event.issue.body}`);
    core.info(`Issue number: ${event.issue.number}`);
    core.info(
        `Issue labels: ${(event.issue.labels?.map(({ name }) => name) ?? []).join(', ')}`,
    );
    core.info(`Workflow: ${event.workflow}`);
    core.info(`Run ID: ${event.runId}`);
    core.endGroup();
};
