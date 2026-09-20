import { createBoundSteps } from 'hub-mason-core/lifecycle/core/bound-steps';
import { LifecycleManager } from 'hub-mason-core/lifecycle/core/manager';

import { AppContext } from '@/src/context/app-context';
import { StepStatus } from '@/src/utils/constants';
import { portalLifecycleConfig } from '@/src/workflow/portal-config';
import { createPortalCommentReporter } from '@/src/workflow/portal-reporter';

import { STEPS as provisionRepositorySteps } from './steps';

export const createLifecycle = (): LifecycleManager<StepStatus> =>
    new LifecycleManager<StepStatus>({
        definitions: provisionRepositorySteps,
        config: portalLifecycleConfig,
        store: AppContext.getInstance().store,
        reporter: createPortalCommentReporter(),
    });

export const createSteps = (manager: LifecycleManager<StepStatus>) =>
    createBoundSteps({
        manager,
        definitions: provisionRepositorySteps,
        running: StepStatus.IN_PROGRESS,
        done: StepStatus.COMPLETED,
        failed: StepStatus.FAILED,
    });
