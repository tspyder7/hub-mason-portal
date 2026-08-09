import { gfmTableToMarkdown } from 'mdast-util-gfm-table';
import { toMarkdown } from 'mdast-util-to-markdown';

import {
    blockquote,
    code,
    heading,
    inlineCode,
    paragraph,
    strong,
    table,
    tableCell,
    tableRow,
    text,
} from '../helpers/markdown';

import type { AppContext } from '../context/app-context';
import type { Step } from '../types/step';
import { StepStatus, StepStatusEmoji } from '../utils/constants';
import type { Blockquote, Code, Paragraph, Root, TableRow } from 'mdast';

const toMarkdownRoot = (children: Root['children']): string =>
    toMarkdown(
        { type: 'root', children },
        { extensions: [gfmTableToMarkdown({ tablePipeAlign: false })] },
    );

const renderStepRow = (step: Step): TableRow =>
    tableRow([
        tableCell([text(step.name)]),
        tableCell([text(StepStatusEmoji[step.status])]),
        tableCell([
            text(step.details.length > 0 ? step.details.join(', ') : '-'),
        ]),
    ]);

const renderFailedStep = (step: Step): Array<Paragraph | Blockquote | Code> => [
    paragraph([text('Failed at step: '), strong(step.name)]),
    blockquote([paragraph([text(step.error?.message ?? 'Unknown error')])]),
    ...(step.error?.stack ? [code(step.error.stack)] : []),
];

export const renderStatusComment = (context: AppContext): string => {
    const failedSteps = context.steps.filter(
        ({ status }) => status === StepStatus.FAILED,
    );
    const runError = context.runError;

    const children: Root['children'] = [
        heading(2, context.request?.type ?? 'request'),
        paragraph([
            text('Request-Id: '),
            inlineCode(context.request?.requestId ?? '-'),
        ]),
    ];

    if (context.steps.length > 0 || failedSteps.length > 0) {
        children.push(
            table([
                tableRow([
                    tableCell([text('Step')]),
                    tableCell([text('Status')]),
                    tableCell([text('Details')]),
                ]),
                ...context.steps.map(renderStepRow),
            ]),
        );
    }

    if (failedSteps.length > 0) {
        children.push(heading(3, 'Error'));
        children.push(...failedSteps.flatMap(renderFailedStep));
    }

    runError &&
        children.push(
            heading(3, 'Error'),
            blockquote([paragraph([text(runError.message)])]),
            ...(runError.stack ? [code(runError.stack)] : []),
        );

    return toMarkdownRoot(children);
};

export const renderSummary = (context: AppContext): string => {
    const failedSteps = context.steps.filter(
        ({ status }) => status === StepStatus.FAILED,
    );

    const failed = failedSteps.length > 0 || context.runError !== null;
    const status = failed ? 'FAILED' : 'COMPLETED';

    const children: Root['children'] = [
        heading(2, 'Summary'),
        paragraph([
            text('Request type: '),
            strong(context.request?.type ?? 'unknown'),
        ]),
        paragraph([
            text('Request-Id: '),
            inlineCode(context.request?.requestId ?? '-'),
        ]),
        paragraph([text('Status: '), strong(status)]),
    ];

    if (failed) {
        const failedStep = failedSteps[0];
        const message =
            failedStep?.error?.message ??
            context.runError?.message ??
            'Unknown error';
        const stack = failedStep?.error?.stack ?? context.runError?.stack;

        children.push(
            heading(3, 'Error'),
            blockquote([paragraph([text(message)])]),
            ...(stack ? [code(stack)] : []),
        );
    }

    return toMarkdownRoot(children);
};
