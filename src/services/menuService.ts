import { WhatsAppOutgoingMessage, WhatsAppInteractive } from '../types';
import { logger } from '../utils/logger';
import { PinSessionService } from './pinSessionService';
import { MenuTemplates, AuthTemplates, ErrorTemplates, BankingTemplates } from '../templates';
import { getRandomWelcomeImage } from '../utils/imageUtils';
import { IWhatsAppService } from '../core/interfaces/IWhatsAppService';

/**
 * Service to manage interactive banking menus
 */
export class MenuService {
  constructor(
    private pinSessionService: PinSessionService,
    private whatsappService: IWhatsAppService
  ) {}
  
  /**
   * Create the welcome message with interactive menu
   */
  async createWelcomeMessage(to: string, userName?: string): Promise<WhatsAppOutgoingMessage> {
    const imageSent = await this.whatsappService.sendImageMessage(
        to, 
        getRandomWelcomeImage(), 
        ''
      );
      if (imageSent) {
        logger.info('Image sent successfully', { to: to });
      } else {
        logger.warn('Failed to send logo image', { to: to });
      }
    return MenuTemplates.createWelcomeMessage(to, userName);
  }

  /**
   * Handle menu selection
   */
  async processMenuSelection(optionId: string, to: string): Promise<WhatsAppOutgoingMessage> {
    let responseText: string;

    // Check if it's a specific account selection (format: account_action_accountNumber)
    // Menu principal options like 'account_balance' should not be processed here
    if (optionId.startsWith('account_') && optionId.split('_').length >= 3) {
      return await this.handleAccountSelection(optionId, to);
    }
    // Handle menu principal actions
    switch (optionId) {
      case 'account_balance':
        return await this.handleBankingAction(to, 'balance', '💰 Account balance');
      case 'mini_statement':
        return await this.handleBankingAction(to, 'statement', '📄 Mini statement');
      case 'intra_bank':
        return await this.handleBankingAction(to, 'transfer', '🏦 Intra-bank transfer');
      case 'pin_info':
        return await this.handleBankingAction(to, 'change_pin', '🔒 Change PIN');
      case 'contact_us':
      case 'inter_bank':
      case 'whatsapp_banking':
      case 'working_hours':
      case 'our_branches':
      case 'atm_pos_network':
        const infoMessages = MenuTemplates.getInfoMessages();
        responseText = infoMessages[optionId as keyof typeof infoMessages] || 'Information not available.';
        break;
      
      default:
        return ErrorTemplates.createUnknownOptionMessage(to);
    }

    return MenuTemplates.createMessageWithMenuButton(to, responseText);
  }

  /**
   * Handle account selection
   */
  private async handleAccountSelection(optionId: string, to: string): Promise<any> {
    try {
      // Parse the ID: account_action_accountNumber
      const parts = optionId.split('_');
      if (parts.length < 3) {
        throw new Error('Invalid account ID format');
      }
      
      const action = parts[1];
      const accountNumber = parts.slice(2).join('_');
      logger.info('Account selection', { phoneNumber: to, action, accountNumber });
      const activeSession = await this.pinSessionService.getActiveSessionByPhoneAndAction(to, action);
      
      if (!activeSession) {
        return ErrorTemplates.createGenericErrorMessage(to, 'Session expired. Please restart from the main menu.');
      }
      await this.pinSessionService.updateSessionAccount(activeSession.id, accountNumber);
      await this.pinSessionService.processActionWithAccount(activeSession.id);
      
      // For transfer actions, don't return to menu - let the transfer process continue
      if (action === 'transfer') {
        // The transfer process will handle sending the next message
        // Return null to indicate no additional message should be sent
        return null;
      }
      
      // For other actions (balance, statement, info), return to main menu
      const imageSent = await this.whatsappService.sendImageMessage(
        to, 
        getRandomWelcomeImage(), 
        ''
      );
      if (imageSent) {
        logger.info('Image sent successfully', { to: to });
      } else {
        logger.warn('Failed to send logo image', { to: to });
      }
      return MenuTemplates.createWelcomeMessage(to);
      
    } catch (error) {
      logger.error('Error selecting account', { optionId, to, error });
      return ErrorTemplates.createAccountSelectionErrorMessage(to);
    }
  }

  /**
   * Handle banking actions requiring PIN authentication
   */
  private async handleBankingAction(to: string, action: string, actionName: string): Promise<WhatsAppOutgoingMessage> {
    try {
      // Check if there's already a valid session with accounts
      const validSession = await this.pinSessionService.getValidSessionWithAccounts(to);
      
      if (validSession && validSession.accounts && validSession.accounts.length > 0) {
        // User has a valid session with accounts, proceed directly with the action
        logger.info('Using existing valid session', {
          phoneNumber: to,
          action,
          sessionId: validSession.session.id,
          accountsCount: validSession.accounts.length
        });
        
        // Réutiliser la session existante en mettant à jour son action
        validSession.session.action = action;
        await this.pinSessionService.updateSessionAction(validSession.session.id, action);
        
        // If user has multiple accounts, show account selection
         if (validSession.accounts.length > 1) {
           return BankingTemplates.createAccountSelectionMessage(to, validSession.accounts, action);
        } else {
          // Single account, proceed directly
          await this.pinSessionService.updateSessionAccount(validSession.session.id, validSession.accounts[0].accountValue);
          await this.pinSessionService.processActionWithAccount(validSession.session.id);
          const imageSent = await this.whatsappService.sendImageMessage(
            to, 
            getRandomWelcomeImage(), 
            ''
          );
          if (imageSent) {
            logger.info('Image sent successfully', { to: to });
          } else {
            logger.warn('Failed to send logo image', { to: to });
          }
          return MenuTemplates.createWelcomeMessage(to);
        }
      }
      
      // No valid session, create a PIN session for authentication
      const sessionId = await this.pinSessionService.createPinSession(to, action);
      const pinLink = this.pinSessionService.generatePinLink(sessionId);
      
      logger.info('Session PIN created', {
        phoneNumber: to,
        action,
        sessionId
      });

      return AuthTemplates.createPinRequestMessage(to, actionName, pinLink);
    } catch (error) {
      logger.error('Error handling banking action', {
        phoneNumber: to,
        action,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return ErrorTemplates.createSessionCreationErrorMessage(to);
    }
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