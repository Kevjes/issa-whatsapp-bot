import { WhatsAppOutgoingMessage } from '../types';
export declare class ErrorTemplates {
    static createGenericErrorMessage(to: string, errorMessage: string): WhatsAppOutgoingMessage;
    static createTechnicalErrorMessage(to: string): WhatsAppOutgoingMessage;
    static createUnknownOptionMessage(to: string): WhatsAppOutgoingMessage;
    static createAccountSelectionErrorMessage(to: string): WhatsAppOutgoingMessage;
    static createSessionCreationErrorMessage(to: string): WhatsAppOutgoingMessage;
    static createApiConnectionErrorMessage(to: string): WhatsAppOutgoingMessage;
    static createTimeoutErrorMessage(to: string): WhatsAppOutgoingMessage;
    static createValidationErrorMessage(to: string, field: string): WhatsAppOutgoingMessage;
    static createServiceUnavailableMessage(to: string): WhatsAppOutgoingMessage;
    static createInvalidFormatMessage(to: string, message: string): WhatsAppOutgoingMessage;
    static createSessionExpiredMessage(to: string): WhatsAppOutgoingMessage;
    static createInvalidOtpMessage(to: string): WhatsAppOutgoingMessage;
}
//# sourceMappingURL=error.d.ts.map