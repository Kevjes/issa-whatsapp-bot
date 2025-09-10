import { Request, Response } from 'express';
import { extractTextFromWhatsAppMessage, extractInteractiveFromIncomingMessage } from '../utils/validation';
import { logger } from '../utils/logger';
import { WhatsAppIncomingMessage } from '../types';
import { IWhatsAppService } from '../core/interfaces/IWhatsAppService';
import { MenuService } from '@/services/menuService';
import { BankingTemplates } from '../templates';


export class MenuController {
  constructor(
    private whatsappService: IWhatsAppService,
    private menuService: MenuService,
  ) {}

  /**
   * Gérer les messages entrants WhatsApp avec le nouveau système de menu
   */
  async handleIncomingMessage(req: Request, res: Response): Promise<void> {
    try {
      logger.debug('Webhook received', {
        method: req.method,
        hasMessages: !!req.body?.entry?.[0]?.changes?.[0]?.value?.messages
      });

      // Vérifier si c'est une notification de message
      if (req.body?.entry?.[0]?.changes?.[0]?.value?.messages) {
        const messages: WhatsAppIncomingMessage[] = req.body.entry[0].changes[0].value.messages;
        const contacts = req.body.entry[0].changes[0].value.contacts || [];

        for (const message of messages) {
          await this.processMessage(message, contacts);
        }
      }

      res.status(200).json({ status: 'success' });
    } catch (error: any) {
      logger.error('Error processing webhook', {
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Traiter un message individuel
   */
  private async processMessage(message: WhatsAppIncomingMessage, contacts: any[]): Promise<void> {
    try {
      const phoneNumber = message.from;
      
      // Extraire le nom de l'utilisateur depuis les contacts
      const userName = this.menuService.extractUserName(contacts) || 'User';
      
      logger.info('Message received', {
        from: phoneNumber,
        type: message.type
      });

      if (message.type === 'interactive') {
        await this.handleInteractiveMessage(message, phoneNumber, userName);
      } else {
        await this.sendWelcomeMessage(phoneNumber, userName);
      }

    } catch (error: any) {
      logger.error('Error processing message', {
        messageId: message.id,
        from: message.from,
        error: error.message
      });
    }
  }

  /**
   * Gérer les messages interactifs (boutons et listes)
   */
  private async handleInteractiveMessage(message: WhatsAppIncomingMessage, phoneNumber: string, userName: string): Promise<void> {
    try {
      const interactiveData = extractInteractiveFromIncomingMessage(message);
      
      if (!interactiveData) {
        logger.warn('Interactive data not found', { phoneNumber });
        await this.sendWelcomeMessage(phoneNumber, userName);
        return;
      }

      logger.info('Option selected', { phoneNumber, optionId: interactiveData.id, title: interactiveData.title });

      // Traiter les options spéciales - vérifier l'ID ET le titre contenant "MENU"
      if (interactiveData.id === 'main_menu' || 
          interactiveData.id === 'return_to_menu' || 
          interactiveData.title.toUpperCase().includes('MENU')) {
        
        const menuMessage = await this.menuService.createWelcomeMessage(phoneNumber);
        await this.whatsappService.sendMessage(menuMessage);
        logger.info('Main menu sent following MENU selection', { phoneNumber, trigger: interactiveData.title });
        return;
      }

      // Traiter les autres options du menu
      const responseMessage = await this.menuService.processMenuSelection(interactiveData.id, phoneNumber);
      
      // Only send message if responseMessage is not null (for transfer account selection)
      if (responseMessage) {
        await this.whatsappService.sendMessage(responseMessage);
      }

    } catch (error) {
      logger.error('Error processing interactive message', {
        phoneNumber,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // En cas d'erreur, renvoyer le menu principal
      const errorMessage = this.menuService.createErrorMessage(phoneNumber, 'Error processing interactive message');
      await this.whatsappService.sendMessage(errorMessage);
    }
  }

  /**
   * Envoyer le message de bienvenue avec le logo et le bouton menu
   */
  private async sendWelcomeMessage(phoneNumber: string, userName: string): Promise<void> {
    try {
      // const imageSent = await this.whatsappService.sendImageMessage(
      //   phoneNumber, 
      //   getRandomWelcomeImage(), 
      //   '🏦 Afriland First Bank'
      // );
      // if (imageSent) {
      //   logger.info('Logo image sent successfully', { to: phoneNumber });
      // } else {
      //   logger.warn('Failed to send logo image', { to: phoneNumber });
      // }

      // Ensuite envoyer le message de bienvenue avec menu
      const welcomeMessage = await this.menuService.createWelcomeMessage(phoneNumber, userName);
      const success = await this.whatsappService.sendMessage(welcomeMessage);
      
      if (success) {
        logger.info('Welcome message sent', {
          to: phoneNumber
        });
      } else {
        logger.error('Failed to send welcome message', {
          to: phoneNumber
        });
      }
    } catch (error: any) {
      logger.error('Error sending welcome message', {
        to: phoneNumber,
        userName: userName,
        error: error.message
      });
    }
  }

  /**
   * Vérification du webhook (GET request)
   */
  verifyWebhook(req: Request, res: Response): void {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      logger.info('Webhook vérifié avec succès');
      res.status(200).send(challenge);
    } else {
      logger.error('Webhook verification failed', {
        mode,
        token,
        expectedToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
      });
      res.status(403).send('Forbidden');
    }
  }
}