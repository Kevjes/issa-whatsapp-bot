export { MenuTemplates } from './menu';
export { ErrorTemplates } from './error';
export { SystemButtonTemplates } from './systemButtons';
export interface MessageTemplate {
    type: 'text' | 'interactive';
    content: any;
}
export interface InteractiveTemplate {
    type: 'list' | 'button';
    header?: {
        type: 'text';
        text: string;
    };
    body: {
        text: string;
    };
    footer?: {
        text: string;
    };
    action: any;
}
export interface TextTemplate {
    body: string;
}
//# sourceMappingURL=index.d.ts.map