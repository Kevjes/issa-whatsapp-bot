import { Request, Response } from 'express';
import { IWhatsAppService } from '../core/interfaces/IWhatsAppService';
import { MenuService } from '@/services/menuService';
export declare class MenuController {
    private whatsappService;
    private menuService;
    constructor(whatsappService: IWhatsAppService, menuService: MenuService);
    handleIncomingMessage(req: Request, res: Response): Promise<void>;
    private processMessage;
    private handleInteractiveMessage;
    private sendWelcomeMessage;
    verifyWebhook(req: Request, res: Response): void;
}
//# sourceMappingURL=menuController.d.ts.map