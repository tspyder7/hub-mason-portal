import { createLifecycleConfig } from 'hub-mason-core/lifecycle/core/config';
import type { LifecycleConfig } from 'hub-mason-core/lifecycle/core/config';

import {
    STATUS_LABEL_PREFIX,
    StepStatus,
    StepStatusEmoji,
} from '../utils/constants';

export const portalLifecycleConfig: LifecycleConfig<StepStatus> =
    createLifecycleConfig<StepStatus>({
        statuses: [
            StepStatus.PENDING,
            StepStatus.IN_PROGRESS,
            StepStatus.COMPLETED,
            StepStatus.CANCELLED,
            StepStatus.FAILED,
        ],
        initial: StepStatus.PENDING,
        transitions: {
            [StepStatus.PENDING]: [
                StepStatus.IN_PROGRESS,
                StepStatus.CANCELLED,
            ],
            [StepStatus.IN_PROGRESS]: [
                StepStatus.COMPLETED,
                StepStatus.FAILED,
                StepStatus.CANCELLED,
            ],
            [StepStatus.COMPLETED]: [],
            [StepStatus.CANCELLED]: [],
            [StepStatus.FAILED]: [],
        },
        terminal: [
            StepStatus.COMPLETED,
            StepStatus.FAILED,
            StepStatus.CANCELLED,
        ],
        emoji: StepStatusEmoji,
        version: '1',
        labelPrefix: STATUS_LABEL_PREFIX,
    });
