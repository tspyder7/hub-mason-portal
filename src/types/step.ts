import type { StepStatus } from '../utils/constants';

export type BoundSteps<T extends readonly StepDefinition[]> = {
    beginStep: (id: T[number]['id'], name?: string) => Promise<void>;
    finishStep: (id: T[number]['id']) => Promise<void>;
    failStep: (id: T[number]['id'], error: unknown) => Promise<void>;
    addStepDetails: (id: T[number]['id'], detail: string) => Promise<void>;
};

export interface StepError {
    message: string;
    stack?: string;
}

export interface StepDefinition {
    id: string;
    name: string;
}

export interface Step {
    id: string;
    name: string;
    status: StepStatus;
    startedAt?: string;
    completedAt?: string;
    details: string[];
    error?: StepError;
}
