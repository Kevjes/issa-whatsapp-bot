import { Request, Response } from 'express';
export declare class MessageController {
    handleIncomingMessage(req: Request, res: Response): Promise<void>;
    private processMessageAsync;
    handleMessageStatus(req: Request, res: Response): Promise<void>;
    sendTestMessage(req: Request, res: Response): Promise<void>;
    getMessageStats(req: Request, res: Response): Promise<void>;
}
export declare const messageController: MessageController;
//# sourceMappingURL=messageController.d.ts.map