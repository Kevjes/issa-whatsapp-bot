import { WhatsAppOutgoingMessage } from '../types';
export declare class MenuTemplates {
    static createWelcomeMessage(to: string, userName?: string): WhatsAppOutgoingMessage;
    static createMessageWithMenuButton(to: string, messageText: string): WhatsAppOutgoingMessage;
    static createReturnToMenuButton(to: string, messageText: string): WhatsAppOutgoingMessage;
    private static getMainMenuSections;
    static getInfoMessages(): {
        contact_us: string;
        about: string;
        where: string;
        working_hours: string;
    };
}
//# sourceMappingURL=menu.d.ts.map