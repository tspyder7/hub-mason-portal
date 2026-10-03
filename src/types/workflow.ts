import type { RequestContext } from 'hub-mason-core/types/request-context';

import type { StepStatus } from '../utils/constants';

export type PortalLocator = {
    owner: string;
    repo: string;
    issueNumber: number;
    statusCommentId: number | null;
    runId: number;
};

export type WorkflowDispatchContext = RequestContext<StepStatus> & {
    portal: PortalLocator;
};
