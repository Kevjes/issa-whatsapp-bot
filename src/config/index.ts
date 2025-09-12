import dotenv from 'dotenv';
import { AppConfig } from '../types';

// Charger les variables d'environnement
dotenv.config();

// Fonction pour valider les variables d'environnement requises
const validateEnvVar = (name: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(`Environement variable are missing: ${name}`);
  }
  return value;
};

// Configuration de l'application
export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  whatsapp: {
    accessToken: validateEnvVar('WHATSAPP_ACCESS_TOKEN', process.env.WHATSAPP_ACCESS_TOKEN),
    phoneNumberId: validateEnvVar('WHATSAPP_PHONE_NUMBER_ID', process.env.WHATSAPP_PHONE_NUMBER_ID),
    businessAccountId: validateEnvVar('WHATSAPP_BUSINESS_ACCOUNT_ID', process.env.WHATSAPP_BUSINESS_ACCOUNT_ID),
    webhookVerifyToken: validateEnvVar('WHATSAPP_WEBHOOK_VERIFY_TOKEN', process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN),
    appSecret: validateEnvVar('WHATSAPP_APP_SECRET', process.env.WHATSAPP_APP_SECRET)
  },
  
  security: {
    jwtSecret: validateEnvVar('JWT_SECRET', process.env.JWT_SECRET),
    encryptionKey: validateEnvVar('ENCRYPTION_KEY', process.env.ENCRYPTION_KEY)
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  },
  
  initWords: {
    words: (process.env.INIT_WORDS || 'hi,hello,bonjour,salut,start,menu,accueil,home,restart,reset')
      .split(',')
      .map(word => word.trim().toLowerCase())
      .filter(word => word.length > 0)
  },
  
  database: {
    path: process.env.DB_PATH || './data/issa.db'
  },
  
  ai: {
    provider: (process.env.AI_PROVIDER as 'openai' | 'deepseek') || 'deepseek',
    apiKey: validateEnvVar('AI_API_KEY', process.env.AI_API_KEY),
    model: process.env.AI_MODEL || (process.env.AI_PROVIDER === 'openai' ? 'gpt-3.5-turbo' : 'deepseek-chat'),
    baseUrl: process.env.AI_BASE_URL
  },
};

// URLs de l'API WhatsApp
export const WHATSAPP_API_BASE_URL = 'https://graph.facebook.com/v22.0';
export const WHATSAPP_SEND_MESSAGE_URL = `${WHATSAPP_API_BASE_URL}/${config.whatsapp.phoneNumberId}/messages`;

// Configuration des logs
export const LOG_CONFIG = {
  level: process.env.LOG_LEVEL || 'info',
  filePath: process.env.LOG_FILE_PATH || './logs/app.log',
  maxFileSize: process.env.LOG_MAX_FILE_SIZE || '20m',
  maxFiles: process.env.LOG_MAX_FILES || '14d',
  errorMaxFiles: process.env.LOG_ERROR_MAX_FILES || '30d',
  enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
  enableFileRotation: process.env.LOG_ENABLE_FILE_ROTATION !== 'false',
  enableCompression: process.env.LOG_ENABLE_COMPRESSION !== 'false'
};

// Messages système pour DeepSeek
export const SYSTEM_PROMPTS = {
  BANKING_ASSISTANT: `
Tu es un assistant bancaire virtuel intelligent et professionnel. 
Tu aides les clients avec leurs demandes bancaires via WhatsApp.
Tu dois être:
- Poli et professionnel
- Clair et concis dans tes réponses
- Sécurisé (ne jamais demander de mots de passe ou informations sensibles)
- Utile pour les questions bancaires générales

Pour le moment, tu ne peux pas accéder aux comptes réels, mais tu peux:
- Expliquer les services bancaires
- Donner des conseils financiers généraux
- Aider avec les questions sur les produits bancaires
- Orienter vers les bonnes ressources

Réponds toujours en français et de manière amicale.`
};

export default config;