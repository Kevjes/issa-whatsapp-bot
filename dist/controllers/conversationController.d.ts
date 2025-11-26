import { Request, Response } from 'express';
import { ConversationService } from '../services/conversationService';
import { IWhatsAppService } from '../core/interfaces/IWhatsAppService';
export declare class ConversationController {
    private conversationService;
    private whatsappService;
    constructor(conversationService: ConversationService, whatsappService: IWhatsAppService);
    handleIncomingMessage(req: Request, res: Response): Promise<void>;
    private processMessageAsync;
    handleMessageStatus(req: Request, res: Response): Promise<void>;
    sendTestMessage(req: Request, res: Response): Promise<void>;
    getConversationStats(req: Request, res: Response): Promise<void>;
    resetUserConversation(req: Request, res: Response): Promise<void>;
    getUserContext(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=conversationController.d.ts.map