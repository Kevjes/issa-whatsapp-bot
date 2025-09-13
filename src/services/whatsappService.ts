import { WhatsAppOutgoingMessage } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';
import { validatePhoneNumber } from '../utils/validation';
import { normalizeCameroonianPhoneNumber } from '../utils/phoneUtils';
import { IWhatsAppService } from '../core/interfaces/IWhatsAppService';
import { IHttpClient } from '../core/interfaces/IHttpClient';

export class WhatsAppService implements IWhatsAppService {
  private accessToken: string;
  private phoneNumberId: string;
  private httpClient: IHttpClient;

  constructor(httpClient: IHttpClient) {
    this.accessToken = config.whatsapp.accessToken;
    this.phoneNumberId = config.whatsapp.phoneNumberId;
    this.httpClient = httpClient;
  }

  /**
   * Envoyer un message via WhatsApp (texte ou interactif)
   */
  async sendMessage(messageData: WhatsAppOutgoingMessage): Promise<boolean> {
    try {
      // Normaliser le numéro de téléphone camerounais
      const normalizedPhoneNumber = normalizeCameroonianPhoneNumber(messageData.to);

      // Valider le numéro de téléphone
      if (!validatePhoneNumber(normalizedPhoneNumber)) {
        logger.error('Invalid phone number', { 
          original: messageData.to,
          normalized: normalizedPhoneNumber 
        });
        return false;
      }

      // Mettre à jour le numéro dans le message
      const finalMessageData = {
        ...messageData,
        to: normalizedPhoneNumber
      };

      // Envoyer le message
      const response = await this.httpClient.post(
        `/${config.whatsapp.phoneNumberId}/messages`,
        finalMessageData
      );

      if (response.status === 200) {
        logger.logWhatsAppMessage('outgoing', normalizedPhoneNumber, finalMessageData);
        logger.info('WhatsApp message sent', {
          to: normalizedPhoneNumber,
          messageId: (response.data as { messages?: { id: string }[] }).messages?.[0]?.id
        });
        return true;
      } else {
        logger.error('Failed to send WhatsApp message', {
          to: normalizedPhoneNumber,
          status: response.status
        });
        return false;
      }

    } catch (error: unknown) {
      // Normaliser le numéro pour les logs d'erreur aussi
      const normalizedPhoneNumber = normalizeCameroonianPhoneNumber(messageData.to);
      
      logger.error('Failed to send WhatsApp message', {
        to: normalizedPhoneNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: (error as { response?: { status?: number } }).response?.status
      });
      return false;
    }
  }

  /**
   * Envoyer un message texte via WhatsApp (méthode de compatibilité)
   */
  async sendTextMessage(to: string, message: string): Promise<boolean> {
    const messageData: WhatsAppOutgoingMessage = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: {
        body: message
      }
    };

    return this.sendMessage(messageData);
  }

  /**
   * Envoyer un message d'erreur standardisé
   */
  async sendErrorMessage(to: string, errorType: 'technical' | 'validation' | 'rate_limit' = 'technical'): Promise<boolean> {
    let errorMessage: string;

    switch (errorType) {
      case 'validation':
        errorMessage = "I'm sorry, I didn't understand your message. Please rephrase your request.";
        break;
      case 'rate_limit':
        errorMessage = "You're sending messages too quickly. Please wait a few moments before trying again.";
        break;
      case 'technical':
      default:
        errorMessage = "I'm having technical difficulties at the moment. Please try again in a few moments or contact our customer support.";
        break;
    }

    return this.sendTextMessage(to, errorMessage);
  }

  /**
   * Envoyer un message image via WhatsApp
   */
  async sendImageMessage(to: string, imageUrl: string, caption?: string): Promise<boolean> {
    const messageData: WhatsAppOutgoingMessage = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'image',
      image: {
        link: imageUrl,
        caption: caption
      }
    };

    return this.sendMessage(messageData);
  }

  /**
   * Marquer un message comme lu
   */
  async markMessageAsRead(messageId: string): Promise<boolean> {
    try {
      const markReadData = {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      };

      const response = await this.httpClient.post(
        `/${config.whatsapp.phoneNumberId}/messages`,
        markReadData
      );

      return response.status === 200;
    } catch (error: unknown) {
      logger.error('Failed to mark message as read', {
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Simuler l'indicateur "En train d'écrire"
   */
  async sendTypingIndicator(to: string, isTyping: boolean): Promise<boolean> {
    try {
      // Normaliser le numéro de téléphone
      const normalizedPhoneNumber = normalizeCameroonianPhoneNumber(to);

      if (!validatePhoneNumber(normalizedPhoneNumber)) {
        logger.error('Invalid phone number for typing indicator', { 
          original: to,
          normalized: normalizedPhoneNumber 
        });
        return false;
      }

      const typingData = {
        messaging_product: 'whatsapp' as const,
        recipient_type: 'individual' as const,
        to: normalizedPhoneNumber,
        type: isTyping ? 'typing_on' as const : 'typing_off' as const
      };

      const response = await this.httpClient.post(
        `/${config.whatsapp.phoneNumberId}/messages`,
        typingData
      );

      if (response.status === 200) {
        logger.debug(`Typing indicator ${isTyping ? 'started' : 'stopped'}`, {
          to: normalizedPhoneNumber
        });
        return true;
      } else {
        logger.warn('Failed to send typing indicator', {
          to: normalizedPhoneNumber,
          status: response.status,
          isTyping
        });
        return false;
      }

    } catch (error: unknown) {
      logger.error('Error sending typing indicator', {
        to,
        isTyping,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Vérifier la santé du service WhatsApp
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Tester en récupérant les informations du numéro de téléphone
      const response = await this.httpClient.get(
        `/${this.phoneNumberId}`
      );

      return response.status === 200;
    } catch (error) {
      logger.error('Failed health check WhatsApp', { error });
      return false;
    }
  }

  /**
   * Obtenir les informations du profil WhatsApp Business
   */
  async getBusinessProfile(): Promise<{ name?: string; description?: string; website?: string; [key: string]: unknown }> {
    try {
      const response = await this.httpClient.get(
        `/${this.phoneNumberId}`,
        {
          params: {
            fields: 'display_phone_number,verified_name,quality_rating'
          }
        }
      );

       return response.data as { name?: string; description?: string; website?: string; [key: string]: unknown };
    } catch (error: unknown) {
      logger.error('Failed to retrieve business profile', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return {};
    }
  }
}

// L'instance sera créée via l'injection de dépendances dans ServiceConfig