import Joi from 'joi';
import { WhatsAppMessage, WhatsAppIncomingMessage } from '../types';
export declare const whatsappMessageSchema: Joi.ObjectSchema<any>;
export declare const validatePhoneNumber: (phoneNumber: string) => boolean;
export declare const validateTextMessage: (message: string) => boolean;
export declare const extractTextFromWhatsAppMessage: (whatsappMessage: WhatsAppMessage) => {
    text: string;
    from: string;
    messageId: string;
} | null;
export declare const extractInteractiveFromWhatsAppMessage: (whatsappMessage: WhatsAppMessage) => {
    type: "button_reply" | "list_reply";
    id: string;
    title: string;
    description?: string;
    from: string;
    messageId: string;
} | null;
export declare const extractInteractiveFromIncomingMessage: (message: WhatsAppIncomingMessage) => {
    type: "button_reply" | "list_reply";
    id: string;
    title: string;
    description?: string;
} | null;
export declare const sanitizeTextForAI: (text: string) => string;
export declare const formatResponseForWhatsApp: (text: string) => string;
export declare const validateWebhookSignature: (payload: string, signature: string, secret: string) => boolean;
export declare const isInitializationWord: (text: string, initWords: string[]) => boolean;
export declare const isInitWord: (text: string) => boolean;
//# sourceMappingURL=validation.d.ts.map