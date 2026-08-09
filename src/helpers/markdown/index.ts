import type {
    Blockquote,
    Code,
    Heading,
    InlineCode,
    Link,
    List,
    ListItem,
    Paragraph,
    Strong,
    Table,
    TableCell,
    TableRow,
    Text,
} from 'mdast';

export const text = (value: string): Text => ({ type: 'text', value });

export const paragraph = (children: Paragraph['children']): Paragraph => ({
    type: 'paragraph',
    children,
});

export const code = (value: string): Code => ({ type: 'code', value });

export const blockquote = (children: Blockquote['children']): Blockquote => ({
    type: 'blockquote',
    children,
});

export const heading = (depth: Heading['depth'], value: string): Heading => ({
    type: 'heading',
    depth,
    children: [text(value)],
});

export const strong = (value: string): Strong => ({
    type: 'strong',
    children: [text(value)],
});

export const inlineCode = (value: string): InlineCode => ({
    type: 'inlineCode',
    value,
});

export const link = (url: string, value: string): Link => ({
    type: 'link',
    url,
    children: [text(value)],
});

export const list = (children: ListItem[]): List => ({
    type: 'list',
    ordered: false,
    spread: false,
    children,
});

export const listItem = (children: ListItem['children']): ListItem => ({
    type: 'listItem',
    children,
});

export const table = (children: TableRow[]): Table => ({
    type: 'table',
    align: [],
    children,
});

export const tableRow = (children: TableCell[]): TableRow => ({
    type: 'tableRow',
    children,
});

export const tableCell = (children: TableCell['children']): TableCell => ({
    type: 'tableCell',
    children,
});
