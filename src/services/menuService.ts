import { WhatsAppOutgoingMessage, WhatsAppInteractive } from '../types';
import { MenuTemplates, ErrorTemplates } from '../templates';
import { IWhatsAppService } from '../core/interfaces/IWhatsAppService';

/**
 * Service to manage interactive banking menus
 */
export class MenuService {
  constructor(
    private whatsappService: IWhatsAppService
  ) {}
  
  /**
   * Create the welcome message with interactive menu
   */
  async createWelcomeMessage(to: string, userName?: string): Promise<WhatsAppOutgoingMessage> {
    return MenuTemplates.createWelcomeMessage(to, userName);
  }

  /**
   * Handle menu selection
   */
  async processMenuSelection(optionId: string, to: string): Promise<WhatsAppOutgoingMessage> {
    let responseText: string;

    // Handle menu principal actions
    switch (optionId) {
      case 'contact_us':
      case 'about':
      case 'where':
      case 'working_hours':
        const infoMessages = MenuTemplates.getInfoMessages();
        responseText = infoMessages[optionId as keyof typeof infoMessages] || 'Information not available.';
        break;
      
      default:
        return ErrorTemplates.createUnknownOptionMessage(to);
    }

    return MenuTemplates.createMessageWithMenuButton(to, responseText);
  }

  /**
   * Create an error message with menu button
   */
  createErrorMessage(to: string, errorMessage: string): WhatsAppOutgoingMessage {
    return ErrorTemplates.createGenericErrorMessage(to, errorMessage);
  }

  /**
   * Extract user name from WhatsApp contacts
   */
  extractUserName(contacts?: any[]): string | undefined {
    if (contacts && contacts.length > 0) {
      return contacts[0].profile?.name;
    }
    return undefined;
  }


}