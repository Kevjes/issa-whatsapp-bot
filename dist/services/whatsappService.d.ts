import { WhatsAppOutgoingMessage } from '../types';
import { IWhatsAppService } from '../core/interfaces/IWhatsAppService';
import { IHttpClient } from '../core/interfaces/IHttpClient';
export declare class WhatsAppService implements IWhatsAppService {
    private accessToken;
    private phoneNumberId;
    private httpClient;
    constructor(httpClient: IHttpClient);
    sendMessage(messageData: WhatsAppOutgoingMessage): Promise<boolean>;
    sendTextMessage(to: string, message: string): Promise<boolean>;
    sendErrorMessage(to: string, errorType?: 'technical' | 'validation' | 'rate_limit'): Promise<boolean>;
    sendImageMessage(to: string, imageUrl: string, caption?: string): Promise<boolean>;
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
//# sourceMappingURL=whatsappService.d.ts.map