import { portalLifecycleConfig } from '@/src/workflow/portal-config';
import { STATUS_LABEL_PREFIX, StepStatus } from '@/src/utils/constants';

describe('portal-config', () => {
    it('should define the portal lifecycle statuses with pending as initial', () => {
        expect(portalLifecycleConfig.statuses).toEqual([
            StepStatus.PENDING,
            StepStatus.IN_PROGRESS,
            StepStatus.COMPLETED,
            StepStatus.CANCELLED,
            StepStatus.FAILED,
        ]);
        expect(portalLifecycleConfig.initial).toBe(StepStatus.PENDING);
    });

    it('should enforce the strict pending to terminal transitions', () => {
        expect(portalLifecycleConfig.transitions).toEqual({
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
        });
        expect(portalLifecycleConfig.terminal).toEqual([
            StepStatus.COMPLETED,
            StepStatus.FAILED,
            StepStatus.CANCELLED,
        ]);
    });

    it('should carry the portal emoji and label prefix', () => {
        expect(portalLifecycleConfig.labelPrefix).toBe(STATUS_LABEL_PREFIX);
        expect(portalLifecycleConfig.emoji?.[StepStatus.FAILED]).toBe('❌');
        expect(portalLifecycleConfig.version).toBe('1');
    });
});
