import { WhatsAppOutgoingMessage } from '../../types';
export interface IWhatsAppService {
    sendMessage(messageData: WhatsAppOutgoingMessage): Promise<boolean>;
    sendTextMessage(to: string, message: string): Promise<boolean>;
    sendErrorMessage(to: string, errorType?: 'technical' | 'validation' | 'rate_limit'): Promise<boolean>;
    markMessageAsRead(messageId: string): Promise<boolean>;
    sendTypingIndicator(to: string, messageId?: string): Promise<boolean>;
    healthCheck(): Promise<boolean>;
    getBusinessProfile(): Promise<{
        name?: string;
        description?: string;
        website?: string;
        [key: string]: unknown;
    }>;
}
//# sourceMappingURL=IWhatsAppService.d.ts.map