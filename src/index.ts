import * as core from '@actions/core';
import { getGithubEvent } from './utils/event';

const event = getGithubEvent();

core.startGroup('Github Event');
core.info(`Event name: ${event.eventName}`);
core.info(`Action: ${event.action}`);
core.info(`Issue title: ${event.issue.title}`);
core.info(`Issue body: ${event.issue.body}`);
core.info(`Issue number: ${event.issue.number}`);
core.info(
    `Issue labels: ${JSON.stringify(event.issue.labels?.map(({ name }) => name) ?? [])}`,
);
core.info(`Repository: ${event.repo.owner}/${event.repo.repo}`);
core.info(`Workflow: ${event.workflow}`);
core.info(`Run ID: ${event.runId}`);
core.info(`Actor: ${event.actor}`);
core.endGroup();
