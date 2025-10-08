import { WhatsAppOutgoingMessage } from '../types';
export declare class AuthTemplates {
    static createPinRequestMessage(to: string, actionName: string, pinLink: string): WhatsAppOutgoingMessage;
    static createAuthErrorMessage(to: string, errorMessage: string): WhatsAppOutgoingMessage;
    static createSessionExpiredMessage(to: string): WhatsAppOutgoingMessage;
    static createInvalidPinMessage(to: string): WhatsAppOutgoingMessage;
    static createPinValidationSuccessMessage(): {
        success: boolean;
        message: string;
    };
    static createPinProcessingErrorMessage(): {
        success: boolean;
        message: string;
    };
    static createInvalidSessionMessage(): {
        success: boolean;
        message: string;
    };
    static createInvalidPinApiMessage(): {
        success: boolean;
        message: string;
    };
    static createNewPinRequestMessage(to: string, pinLink: string): WhatsAppOutgoingMessage;
    static createSamePinErrorMessage(to: string): WhatsAppOutgoingMessage;
    static createPinChangeSuccessMessage(to: string): WhatsAppOutgoingMessage;
    static createPinChangeErrorMessage(to: string, errorMessage: string): WhatsAppOutgoingMessage;
}
//# sourceMappingURL=auth.d.ts.map