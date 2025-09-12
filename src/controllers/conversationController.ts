import { Request, Response } from 'express';
import { WhatsAppMessage } from '../types';
import { extractTextFromWhatsAppMessage } from '../utils/validation';
import { logger } from '../utils/logger';
import { userRateLimiter } from '../middlewares/rateLimiter';
import { ConversationService } from '../services/conversationService';
import { IWhatsAppService } from '../core/interfaces/IWhatsAppService';

export class ConversationController {
  private conversationService: ConversationService;
  private whatsappService: IWhatsAppService;

  constructor(
    conversationService: ConversationService,
    whatsappService: IWhatsAppService
  ) {
    this.conversationService = conversationService;
    this.whatsappService = whatsappService;
  }

  /**
   * Traiter les messages entrants de WhatsApp avec le nouveau système conversationnel
   */
  async handleIncomingMessage(req: Request, res: Response): Promise<void> {
    try {
      const whatsappMessage: WhatsAppMessage = req.body;
      
      logger.info('Message WhatsApp received', {
        messageData: whatsappMessage
      });

      // Extraire le message texte
      const messageData = extractTextFromWhatsAppMessage(whatsappMessage);
      
      if (!messageData) {
        logger.info('Message is not text or invalid - ignored');
        res.status(200).json({ status: 'ignored' });
        return;
      }

      const { text, from, messageId } = messageData;
      
      logger.info('Text message extracted', {
        from,
        messageId,
        textLength: text.length,
        preview: text.substring(0, 50)
      });

      // Vérification du rate limiting
      const rateLimitResult = userRateLimiter.check(from);
      if (!rateLimitResult.allowed) {
        logger.warn('Rate limit exceeded for user', {
          from,
          resetTime: rateLimitResult.resetTime
        });
        
        await this.whatsappService.sendErrorMessage(from, 'rate_limit');
        res.status(200).json({ status: 'rate_limited' });
        return;
      }

      // Marquer le message comme lu
      await this.whatsappService.markMessageAsRead(messageId);

      // Traiter le message de façon asynchrone
      this.processMessageAsync(text, from, messageId);

      // Réponse immédiate à WhatsApp
      res.status(200).json({ status: 'received' });

    } catch (error: unknown) {
      logger.error('Error processing incoming message', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        body: req.body
      });
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Traiter le message de façon asynchrone
   */
  private async processMessageAsync(text: string, from: string, messageId: string): Promise<void> {
    try {
      logger.info('Asynchronous message processing started', {
        from,
        messageId,
        textPreview: text.substring(0, 100)
      });

      // Traiter le message avec le service de conversation
      const result = await this.conversationService.processMessage(from, messageId, text);
      
      if (!result.response) {
        logger.error('No response generated from conversation service', {
          from,
          messageId
        });
        await this.whatsappService.sendErrorMessage(from, 'technical');
        return;
      }

      // Envoyer la réponse via WhatsApp
      const messageSent = await this.whatsappService.sendTextMessage(from, result.response);
      
      if (messageSent) {
        logger.info('Response sent successfully', {
          from,
          messageId,
          responseLength: result.response.length,
          shouldContinue: result.shouldContinue
        });
      } else {
        logger.error('Failed to send WhatsApp response', {
          from,
          messageId
        });
      }

    } catch (error: unknown) {
      logger.error('Error processing asynchronous message', {
        from,
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Tenter d'envoyer un message d'erreur
      try {
        await this.whatsappService.sendErrorMessage(from, 'technical');
      } catch (sendError: unknown) {
        logger.error('Failed to send error message', {
          from,
          sendError: sendError instanceof Error ? sendError.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Gérer les statuts de messages (delivered, read, etc.)
   */
  async handleMessageStatus(req: Request, res: Response): Promise<void> {
    try {
      const whatsappMessage: WhatsAppMessage = req.body;
      
      // Extraire les statuts
      const entry = whatsappMessage.entry[0];
      const change = entry.changes[0];
      const statuses = change.value.statuses;
      
      if (statuses && statuses.length > 0) {
        for (const status of statuses) {
          logger.info('Message status received', {
            messageId: status.id,
            status: status.status,
            recipientId: status.recipient_id,
            timestamp: status.timestamp
          });
        }
      }
      
      res.status(200).json({ status: 'processed' });
      
    } catch (error: unknown) {
      logger.error('Error processing message status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body
      });
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Envoyer un message de test
   */
  async sendTestMessage(req: Request, res: Response): Promise<void> {
    try {
      const { to, message } = req.body;
      
      if (!to || !message) {
        res.status(400).json({ 
          error: 'Missing parameters: to and message required' 
        });
        return;
      }
      
      logger.info('Test message request', { to, message });
      
      const success = await this.whatsappService.sendTextMessage(to, message);
      
      if (success) {
        res.status(200).json({ 
          status: 'sent',
          message: 'Message sent successfully'
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to send message'
        });
      }
      
    } catch (error: unknown) {
      logger.error('Error sending test message', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body
      });
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Obtenir les statistiques de conversation
   */
  async getConversationStats(req: Request, res: Response): Promise<void> {
    try {
      // Pour l'instant, retourner des statistiques basiques
      // Plus tard, on peut les récupérer depuis la base de données
      const stats = {
        totalConversations: 0,
        activeUsers: 0,
        messagesProcessed: 0,
        averageResponseTime: 0,
        aiProvider: 'configured',
        knowledgeBaseEntries: 0,
        lastUpdated: new Date().toISOString()
      };
      
      res.status(200).json(stats);
      
    } catch (error: unknown) {
      logger.error('Failed to retrieve conversation stats', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Réinitialiser la conversation d'un utilisateur
   */
  async resetUserConversation(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        res.status(400).json({
          error: 'Phone number is required'
        });
        return;
      }

      await this.conversationService.resetConversation(phoneNumber);
      
      res.status(200).json({
        status: 'success',
        message: 'Conversation reset successfully'
      });

    } catch (error: unknown) {
      logger.error('Error resetting conversation', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body
      });
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Obtenir le contexte de conversation d'un utilisateur
   */
  async getUserContext(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber } = req.params;
      
      if (!phoneNumber) {
        res.status(400).json({
          error: 'Phone number is required'
        });
        return;
      }

      const context = await this.conversationService.getConversationContext(phoneNumber);
      
      if (!context) {
        res.status(404).json({
          error: 'User context not found'
        });
        return;
      }

      // Ne pas retourner l'historique complet pour éviter des réponses trop lourdes
      const { conversationHistory, ...contextWithoutHistory } = context;
      
      res.status(200).json({
        ...contextWithoutHistory,
        messageCount: conversationHistory.length,
        lastMessages: conversationHistory.slice(-5) // Derniers 5 messages seulement
      });

    } catch (error: unknown) {
      logger.error('Error getting user context', {
        error: error instanceof Error ? error.message : 'Unknown error',
        phoneNumber: req.params.phoneNumber
      });
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}