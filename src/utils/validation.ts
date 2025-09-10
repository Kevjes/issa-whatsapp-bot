import Joi from 'joi';
import { WhatsAppMessage, WhatsAppIncomingMessage } from '../types';
import { normalizeCameroonianPhoneNumber } from './phoneUtils';

// Schéma de validation pour les messages WhatsApp entrants
export const whatsappMessageSchema = Joi.object({
  object: Joi.string().valid('whatsapp_business_account').required(),
  entry: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      changes: Joi.array().items(
        Joi.object({
          value: Joi.object({
            messaging_product: Joi.string().valid('whatsapp').required(),
            metadata: Joi.object({
              display_phone_number: Joi.string().required(),
              phone_number_id: Joi.string().required()
            }).required(),
            contacts: Joi.array().items(
              Joi.object({
                profile: Joi.object({
                  name: Joi.string().required()
                }).required(),
                wa_id: Joi.string().required()
              })
            ).optional(),
            messages: Joi.array().items(
              Joi.object({
                from: Joi.string().required(),
                id: Joi.string().required(),
                timestamp: Joi.string().required(),
                text: Joi.object({
                  body: Joi.string().required()
                }).optional(),
                type: Joi.string().valid('text', 'image', 'audio', 'video', 'document', 'interactive').required(),
                context: Joi.object({
                  from: Joi.string().optional(),
                  id: Joi.string().optional(),
                  referred_product: Joi.object().optional()
                }).optional(),
                interactive: Joi.object({
                  type: Joi.string().valid('button_reply', 'list_reply').required(),
                  button_reply: Joi.object({
                    id: Joi.string().required(),
                    title: Joi.string().required()
                  }).when('type', { is: 'button_reply', then: Joi.required(), otherwise: Joi.forbidden() }),
                  list_reply: Joi.object({
                    id: Joi.string().required(),
                    title: Joi.string().required(),
                    description: Joi.string().optional()
                  }).when('type', { is: 'list_reply', then: Joi.required(), otherwise: Joi.forbidden() })
                }).when('type', { is: 'interactive', then: Joi.required(), otherwise: Joi.forbidden() })
              })
            ).optional(),
            statuses: Joi.array().optional()
          }).required(),
          field: Joi.string().valid('messages').required()
        })
      ).required()
    })
  ).required()
});

// Validation des numéros de téléphone WhatsApp
export const validatePhoneNumber = (phoneNumber: string): boolean => {
  const phoneRegex = /^\d{10,15}$/;
  return phoneRegex.test(phoneNumber);
};

// Validation du format des messages texte
export const validateTextMessage = (message: string): boolean => {
  if (!message || typeof message !== 'string') {
    return false;
  }
  
  if (message.length > 4096) {
    return false;
  }
  
  if (message.trim().length === 0) {
    return false;
  }
  
  return true;
};

// Extraire le message texte d'un message WhatsApp
export const extractTextFromWhatsAppMessage = (whatsappMessage: WhatsAppMessage): {
  text: string;
  from: string;
  messageId: string;
} | null => {
  try {
    const entry = whatsappMessage.entry[0];
    const change = entry.changes[0];
    const messages = change.value.messages;
    
    if (!messages || messages.length === 0) {
      return null;
    }
    
    const message = messages[0];
    
    if (message.type !== 'text' || !message.text) {
      return null;
    }
    
    const normalizedFrom = normalizeCameroonianPhoneNumber(message.from);
    
    return {
      text: message.text.body,
      from: normalizedFrom,
      messageId: message.id
    };
  } catch (error) {
    return null;
  }
};

// Extraire les messages interactifs d'un message WhatsApp complet
export const extractInteractiveFromWhatsAppMessage = (whatsappMessage: WhatsAppMessage): {
  type: 'button_reply' | 'list_reply';
  id: string;
  title: string;
  description?: string;
  from: string;
  messageId: string;
} | null => {
  try {
    const entry = whatsappMessage.entry[0];
    const change = entry.changes[0];
    const messages = change.value.messages;
    
    if (!messages || messages.length === 0) {
      return null;
    }
    
    const message = messages[0];
    
    if (message.type !== 'interactive' || !message.interactive) {
      return null;
    }
    
    const normalizedFrom = normalizeCameroonianPhoneNumber(message.from);
    
    const interactive = message.interactive;
    
    if (interactive.type === 'button_reply' && interactive.button_reply) {
      return {
        type: 'button_reply',
        id: interactive.button_reply.id,
        title: interactive.button_reply.title,
        from: normalizedFrom,
        messageId: message.id
      };
    }
    
    if (interactive.type === 'list_reply' && interactive.list_reply) {
      return {
        type: 'list_reply',
        id: interactive.list_reply.id,
        title: interactive.list_reply.title,
        description: interactive.list_reply.description,
        from: normalizedFrom,
        messageId: message.id
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

// Extraire les messages interactifs d'un message WhatsApp individuel
export const extractInteractiveFromIncomingMessage = (message: WhatsAppIncomingMessage): {
  type: 'button_reply' | 'list_reply';
  id: string;
  title: string;
  description?: string;
} | null => {
  try {
    if (message.type !== 'interactive' || !message.interactive) {
      return null;
    }
    
    const interactive = message.interactive;
    
    if (interactive.type === 'button_reply' && interactive.button_reply) {
      return {
        type: 'button_reply',
        id: interactive.button_reply.id,
        title: interactive.button_reply.title
      };
    }
    
    if (interactive.type === 'list_reply' && interactive.list_reply) {
      return {
        type: 'list_reply',
        id: interactive.list_reply.id,
        title: interactive.list_reply.title,
        description: interactive.list_reply.description
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

export const sanitizeTextForAI = (text: string): string => {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .substring(0, 1000);
};

export const formatResponseForWhatsApp = (text: string): string => {
  if (text.length > 4096) {
    return text.substring(0, 4090) + '...';
  }
  
  return text;
};

// Valider la signature du webhook WhatsApp
export const validateWebhookSignature = (payload: string, signature: string, secret: string): boolean => {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  const receivedSignature = signature.replace('sha256=', '');
  
  const isValid = crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(receivedSignature, 'hex')
  );
  
  return isValid;
};

/**
 * Vérifie si le texte correspond à un mot d'initialisation
 * @param text - Le texte à vérifier
 * @param initWords - La liste des mots d'initialisation
 * @returns true si le texte correspond à un mot d'initialisation
 */
export const isInitializationWord = (text: string, initWords: string[]): boolean => {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  const normalizedText = text.trim().toLowerCase();
  return initWords.includes(normalizedText);
};

/**
 * Vérifie si le texte correspond à un mot d'initialisation en utilisant la configuration
 * @param text - Le texte à vérifier
 * @returns true si le texte correspond à un mot d'initialisation
 */
export const isInitWord = (text: string): boolean => {
  const { config } = require('../config');
  return isInitializationWord(text, config.initWords.words);
};