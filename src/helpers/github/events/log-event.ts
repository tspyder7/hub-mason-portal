import { logger } from '../../../utils/logger';
import type { GithubEvent } from '../../../types';

export const logEvent = (event: GithubEvent) => {
    logger.info('Github Event');
    logger.info(`Event name: ${event.eventName}`);
    logger.info(`Action: ${event.action}`);
    logger.info(`Issue title: ${event.issue.title}`);
    logger.info(`Issue body: ${event.issue.body}`);
    logger.info(`Issue number: ${event.issue.number}`);
    logger.info(
        `Issue labels: ${(event.issue.labels?.map(({ name }) => name) ?? []).join(', ')}`,
    );
    logger.info(`Workflow: ${event.workflow}`);
    logger.info(`Run ID: ${event.runId}`);
};
