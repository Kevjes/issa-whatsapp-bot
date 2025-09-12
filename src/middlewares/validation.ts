import { Request, Response, NextFunction } from 'express';
import { whatsappMessageSchema, validateWebhookSignature } from '../utils/validation';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ApiError } from '../types';

/**
 * Middleware pour valider les webhooks WhatsApp
 */
export const validateWhatsAppWebhook = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const signature = req.get('X-Hub-Signature-256');
    if (signature) {
      let payload: string;
      
      if ('rawBody' in req && req.rawBody) {
        payload = (req.rawBody as Buffer).toString('utf8');
      } else {
        payload = JSON.stringify(req.body);
      }
      
      logger.debug('Validation of webhook signature', {
        payloadLength: payload.length
      });
      
      const isValidSignature = validateWebhookSignature(
        payload,
        signature,
        config.whatsapp.appSecret
      );
      
      if (!isValidSignature) {
        logger.warn('Invalid webhook signature', {
          ip: req.ip
        });
        res.status(401).json({ error: 'Invalid webhook signature' });
        return;
      }
    }

    // Valider la structure du message
    const { error, value } = whatsappMessageSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid WhatsApp message structure', {
        errorCount: error.details.length,
        firstError: error.details[0]?.message
      });
      res.status(400).json({ 
        error: 'Invalid WhatsApp message structure',
        details: error.details
      });
      return;
    }

    // Ajouter le message validé à la requête
    req.body = value;
    next();

  } catch (error: unknown) {
    logger.error('Error validating webhook', {
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body
    });
    res.status(500).json({ error: 'Error validating webhook' });
  }
};

/**
 * Middleware pour valider le token de vérification du webhook
 */
export const validateWebhookVerification = (req: Request, res: Response, _next: NextFunction): void => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Vérifier que c'est une requête de vérification
  if (mode === 'subscribe' && token === config.whatsapp.webhookVerifyToken) {
    // logger.info('Webhook vérifié avec succès');
    res.status(200).send(challenge);
    return;
  }

  logger.warn('Webhook verification failed', {
    mode,
    token,
    expectedToken: config.whatsapp.webhookVerifyToken
  });
  
  res.status(403).json({ error: 'Invalid webhook verification token' });
};

/**
 * Middleware pour gérer les erreurs de l'API
 */
export const errorHandler = (error: unknown, req: Request, res: Response, _next: NextFunction): void => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  logger.error('API error', {
    error: errorMessage,
    stack: errorStack,
    url: req.url,
    method: req.method,
    body: req.body
  });

  // Erreur personnalisée
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const customError = error as { statusCode: number; message: string; code?: string };
    res.status(customError.statusCode).json({
      error: customError.message,
      code: customError.code || 'UNKNOWN_ERROR'
    });
    return;
  }

  // Erreur de validation Joi
  if (error && typeof error === 'object' && 'isJoi' in error && 'details' in error) {
    const joiError = error as { details: unknown[] };
    res.status(400).json({
      error: 'Invalid data',
      details: joiError.details
    });
    return;
  }

  // Erreur générique
  res.status(500).json({
    error: 'Internal server error'
  });
};

/**
 * Middleware pour logger les requêtes
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    if(req.url.trim() !== '/webhook' && req.url.trim() !== '/'){
      logger.info('HTTP request', {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
  });
  
  next();
};

/**
 * Middleware pour vérifier les headers requis
 */
export const validateHeaders = (req: Request, res: Response, next: NextFunction): void => {
  const contentType = req.get('Content-Type');
  
  if (req.method === 'POST' && !contentType?.includes('application/json')) {
    res.status(400).json({
      error: 'Content-Type must be application/json'
    });
    return;
  }
  
  next();
};

/**
 * Créer une erreur API personnalisée
 */
export const createApiError = (message: string, statusCode: number, code?: string): ApiError => {
  return {
    message,
    statusCode,
    code: code || 'API_ERROR'
  };
};