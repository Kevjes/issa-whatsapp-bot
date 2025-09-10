import { Request, Response } from 'express';
import { WhatsAppMessage } from '../types';
import { extractTextFromWhatsAppMessage } from '../utils/validation';
import { logger } from '../utils/logger';
import { userRateLimiter } from '../middlewares/rateLimiter';
import { container, TOKENS } from '../core/di/Container';
import { WhatsAppService } from '@/services/whatsappService';
// Services résolus via injection de dépendances

export class MessageController {
  /**
   * Traiter les messages entrants de WhatsApp
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
        logger.info('Message is not text or invalid ignored');
        res.status(200).json({ status: 'ignored' });
        return;
      }

      const { text, from, messageId } = messageData;
      
      logger.info('Message text extracted', {
        from,
        messageId,
        textLength: text.length
      });

      // Check rate limiting
      const rateLimitResult = userRateLimiter.check(from);
      if (!rateLimitResult.allowed) {
        logger.warn('Rate limit exceeded for user', {
          from,
          resetTime: rateLimitResult.resetTime
        });
        
        const whatsappService = await container.resolve<WhatsAppService>(TOKENS.WHATSAPP_SERVICE);
        await whatsappService.sendErrorMessage(from, 'rate_limit');
        res.status(200).json({ status: 'rate_limited' });
        return;
      }

      // Resolve services
      const whatsappService = await container.resolve<WhatsAppService>(TOKENS.WHATSAPP_SERVICE);
      
      // Mark message as read
      await whatsappService.markMessageAsRead(messageId);

      // Process message asynchronously
      this.processMessageAsync(text, from, messageId);

      // Respond immediately to WhatsApp
      res.status(200).json({ status: 'received' });

    } catch (error: any) {
      logger.error('Error processing incoming message', {
        error: error.message,
        stack: error.stack,
        body: req.body
      });
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Process the message asynchronously
   */
  private async processMessageAsync(text: string, from: string, messageId: string): Promise<void> {
    try {
      logger.info('Asynchronous message processing started', {
        from,
        messageId,
        textPreview: text.substring(0, 100)
      });

      // Resolve services
      const whatsappService: WhatsAppService = await container.resolve<WhatsAppService>(TOKENS.WHATSAPP_SERVICE);

      // Send response via WhatsApp
      const messageSent = await whatsappService.sendTextMessage(from, text);
      
      if (messageSent) {
        logger.info('Response sent successfully', {
          from,
          messageId,
          responseLength: text.length
        });
      } else {
        logger.error('Failed to send WhatsApp response', {
          from,
          messageId
        });
      }

    } catch (error: any) {
      logger.error('Error processing asynchronous message', {
        from,
        messageId,
        error: error.message,
        stack: error.stack
      });
      
      // Tenter d'envoyer un message d'erreur
      try {
        const whatsappService = await container.resolve<WhatsAppService>(TOKENS.WHATSAPP_SERVICE);
        await whatsappService.sendErrorMessage(from, 'technical');
      } catch (sendError: any) {
        logger.error('Failed to send error message', {
          from,
          sendError: sendError.message
        });
      }
    }
  }

  /**
   * Handle message statuses (delivered, read, etc.)
   */
  async handleMessageStatus(req: Request, res: Response): Promise<void> {
    try {
      const whatsappMessage: WhatsAppMessage = req.body;
      
      // Extract statuses
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
      
    } catch (error: any) {
      logger.error('Error processing message status', {
        error: error.message,
        body: req.body
      });
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Send a test message (for testing purposes)
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
      
      logger.info('Test message sent', { to, message });
      
      const whatsappService = await container.resolve<WhatsAppService>(TOKENS.WHATSAPP_SERVICE);
      const success = await whatsappService.sendTextMessage(to, message);
      
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
      
    } catch (error: any) {
      logger.error('Error sending test message', {
        error: error.message,
        body: req.body
      });
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get message statistics
   */
  async getMessageStats(req: Request, res: Response): Promise<void> {
    try {
      // For now, return basic statistics
      // Later, we can retrieve them from a database
      const stats = {
        totalMessages: 0,
        successfulResponses: 0,
        errors: 0,
        averageResponseTime: 0,
        lastUpdated: new Date().toISOString()
      };
      
      res.status(200).json(stats);
      
    } catch (error: any) {
      logger.error('Failed to retrieve message stats', {
        error: error.message
      });
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const messageController = new MessageController();