import { serializeError } from 'serialize-error';
import { AppContext } from '../context/app-context';
import type {
    BoundSteps,
    Step,
    StepDefinition,
    StepError,
} from '../types/step';
import { StepStatus } from '../utils/constants';
import { upsertStatusComment } from './status-comment';

const findStep = (context: AppContext, id: string): Step => {
    const step = context.steps.find(({ id: stepId }) => stepId === id);

    if (!step) {
        throw new Error(`Step not found: ${id}`);
    }

    return step;
};

export const toStepError = (error: unknown): StepError => {
    const serialized = serializeError(error) as {
        message?: string;
        stack?: string;
    };

    return {
        message: serialized.message ?? 'Unknown error',
        stack: serialized.stack,
    };
};

export const beginStep = async (id: string, name?: string): Promise<void> => {
    const context = AppContext.getInstance();

    findStep(context, id);

    context.setSteps(
        context.steps.map((step) =>
            step.id === id
                ? {
                      ...step,
                      name: name ?? step.name,
                      status: StepStatus.IN_PROGRESS,
                      startedAt: step.startedAt ?? new Date().toISOString(),
                  }
                : step,
        ),
    );

    await upsertStatusComment();
};

export const finishStep = async (id: string): Promise<void> => {
    const context = AppContext.getInstance();

    findStep(context, id);

    context.setSteps(
        context.steps.map((step) =>
            step.id === id
                ? {
                      ...step,
                      status: StepStatus.COMPLETED,
                      completedAt: new Date().toISOString(),
                  }
                : step,
        ),
    );

    await upsertStatusComment();
};

export const failStep = async (id: string, error: unknown): Promise<void> => {
    const context = AppContext.getInstance();

    findStep(context, id);

    context.setSteps(
        context.steps.map((step) =>
            step.id === id
                ? {
                      ...step,
                      status: StepStatus.FAILED,
                      completedAt: new Date().toISOString(),
                      error: toStepError(error),
                  }
                : step,
        ),
    );

    await upsertStatusComment();
};

export const failActiveStep = async (error: unknown): Promise<void> => {
    const context = AppContext.getInstance();

    const activeStep = context.steps.find(
        ({ status }) => status === StepStatus.IN_PROGRESS,
    );

    if (!activeStep) {
        return;
    }

    await failStep(activeStep.id, error);
};

export const cancelPendingSteps = (): void => {
    const context = AppContext.getInstance();

    context.setSteps(
        context.steps.map((step) =>
            step.status === StepStatus.PENDING ||
            step.status === StepStatus.IN_PROGRESS
                ? {
                      ...step,
                      status: StepStatus.CANCELLED,
                      completedAt: step.completedAt ?? new Date().toISOString(),
                  }
                : step,
        ),
    );
};

export const addStepDetails = async (
    id: string,
    detail: string,
): Promise<void> => {
    const context = AppContext.getInstance();

    findStep(context, id);

    context.setSteps(
        context.steps.map((step) =>
            step.id === id
                ? { ...step, details: [...step.details, detail] }
                : step,
        ),
    );

    await upsertStatusComment();
};

export const createSteps = <const T extends readonly StepDefinition[]>(
    defs: T,
): BoundSteps<T> => {
    const assertKnown = (id: T[number]['id']): void => {
        if (!defs.some(({ id: defId }) => defId === id)) {
            throw new Error(`Unknown step: ${id}`);
        }
    };

    return {
        beginStep: async (id, name) => {
            assertKnown(id);
            await beginStep(id, name);
        },
        finishStep: async (id) => {
            assertKnown(id);
            await finishStep(id);
        },
        failStep: async (id, error) => {
            assertKnown(id);
            await failStep(id, error);
        },
        addStepDetails: async (id, detail) => {
            assertKnown(id);
            await addStepDetails(id, detail);
        },
    };
};
