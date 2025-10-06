import { WhatsAppOutgoingMessage } from '../types';
import { IWhatsAppService } from '../core/interfaces/IWhatsAppService';
export declare class MenuService {
    private whatsappService;
    constructor(whatsappService: IWhatsAppService);
    createWelcomeMessage(to: string, userName?: string): Promise<WhatsAppOutgoingMessage>;
    processMenuSelection(optionId: string, to: string): Promise<WhatsAppOutgoingMessage>;
    createErrorMessage(to: string, errorMessage: string): WhatsAppOutgoingMessage;
    extractUserName(contacts?: any[]): string | undefined;
}
//# sourceMappingURL=menuService.d.ts.map