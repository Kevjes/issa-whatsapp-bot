import { Router } from 'express';
import { MenuController } from '../controllers/menuController';
import { 
  validateWhatsAppWebhook, 
  validateHeaders 
} from '../middlewares/validation';
import { webhookRateLimit } from '../middlewares/rateLimiter';
import { logger } from '../utils/logger';
import { container, TOKENS } from '../core';

const router = Router();

/**
 * GET /webhook - Vérification du webhook par Meta
 * Cette route est appelée par Meta pour vérifier que le webhook est valide
 */
router.get('/', async (req, res) => {
  const menuController = await container.resolve<MenuController>(TOKENS.MENU_CONTROLLER);
  return menuController.verifyWebhook(req, res);
});

/**
 * POST /webhook - Réception des messages WhatsApp
 * Cette route reçoit tous les événements WhatsApp (messages, statuts, etc.)
 */
router.post('/',
  webhookRateLimit,
  validateHeaders,
  validateWhatsAppWebhook,
  async (req, res) => {
    try {
      const whatsappMessage = req.body;
      
      // Vérifier le type d'événement
      const entry = whatsappMessage.entry[0];
      const change = entry.changes[0];
      const value = change.value;
      
      // Traiter les messages entrants avec le nouveau système de menu
      if (value.messages && value.messages.length > 0) {
        const message = value.messages[0];
        const phoneNumber = message.from;
        
        // Logger le message entrant
        logger.logWhatsAppMessage('incoming', phoneNumber, message);
        
        const menuController = await container.resolve<MenuController>(TOKENS.MENU_CONTROLLER);
        await menuController.handleIncomingMessage(req, res);
        return;
      }
      
      // Traiter les statuts de messages (log seulement)
      if (value.statuses && value.statuses.length > 0) {
        res.status(200).json({ status: 'received' });
        return;
      }
      // Répondre OK pour tous les autres événements
      res.status(200).json({ status: 'received' });
      
    } catch (error: any) {
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /webhook/health - Vérification de santé du webhook
 */
router.get('/health', async (req, res) => {
  try {
    logger.info('Health check webhook requested');
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      webhook: 'whatsapp',
      version: '1.0.0'
    });
    
  } catch (error: any) {
    logger.error('Health check webhook failed', {
      error: error.message
    });
    
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * POST /webhook/test - Endpoint de test pour simuler un message
 * Utile pour les tests en développement
 */
if (process.env.NODE_ENV === 'development') {
  router.post('/test', async (req, res) => {
    try {
      const { phoneNumber, message } = req.body;
      
      if (!phoneNumber || !message) {
        res.status(400).json({
          error: 'phoneNumber and message are required'
        });
        return;
      }
      
      // Créer un message WhatsApp simulé
      const simulatedMessage = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'test-entry-id',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '1234567890',
                phone_number_id: 'test-phone-id'
              },
              contacts: [{
                profile: {
                  name: 'Test User'
                },
                wa_id: phoneNumber
              }],
              messages: [{
                from: phoneNumber,
                id: `test-msg-${Date.now()}`,
                timestamp: Date.now().toString(),
                text: {
                  body: message
                },
                type: 'text'
              }]
            },
            field: 'messages'
          }]
        }]
      };
      
      // Traiter le message simulé avec le nouveau système de menu
      req.body = simulatedMessage;
      const menuController = await container.resolve<MenuController>(TOKENS.MENU_CONTROLLER);
      await menuController.handleIncomingMessage(req, res);
      
    } catch (error: any) {
      logger.error('Test webhook failed', {
        error: error.message,
        body: req.body
      });
      
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}

export default router;