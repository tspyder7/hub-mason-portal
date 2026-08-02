import type { StepDefinition } from '../../../types/step';

export enum Step {
    VERIFY_ISSUE = 'verify-issue',
    VALIDATE_REQUEST = 'provision-repository-request-checks',
    PROVISION_REPOSITORY = 'provision-repository',
}

export const STEPS = [
    { id: Step.VERIFY_ISSUE, name: 'Verify issue' },
    { id: Step.VALIDATE_REQUEST, name: 'Provision repository request checks' },
    { id: Step.PROVISION_REPOSITORY, name: 'Provision repository' },
] as const satisfies readonly StepDefinition[];
