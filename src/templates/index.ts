/**
 * Index des templates de messages WhatsApp
 * Centralise tous les templates pour une meilleure organisation
 */

export { MenuTemplates } from './menu';
export { AuthTemplates } from './auth';
export { BankingTemplates } from './banking';
export { ErrorTemplates } from './error';
export { SystemButtonTemplates } from './systemButtons';

// Types pour les templates
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