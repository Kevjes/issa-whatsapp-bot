"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYSTEM_PROMPTS = exports.LOG_CONFIG = exports.WHATSAPP_SEND_MESSAGE_URL = exports.WHATSAPP_API_BASE_URL = exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const validateEnvVar = (name, value) => {
    if (!value) {
        throw new Error(`Environement variable are missing: ${name}`);
    }
    return value;
};
exports.config = {
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
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
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
        provider: process.env.AI_PROVIDER || 'deepseek',
        apiKey: validateEnvVar('AI_API_KEY', process.env.AI_API_KEY),
        model: process.env.AI_MODEL || (process.env.AI_PROVIDER === 'openai' ? 'gpt-3.5-turbo' : 'deepseek-chat'),
        baseUrl: process.env.AI_BASE_URL
    },
};
exports.WHATSAPP_API_BASE_URL = 'https://graph.facebook.com/v23.0';
exports.WHATSAPP_SEND_MESSAGE_URL = `${exports.WHATSAPP_API_BASE_URL}/${exports.config.whatsapp.phoneNumberId}/messages`;
exports.LOG_CONFIG = {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs/app.log',
    maxFileSize: process.env.LOG_MAX_FILE_SIZE || '20m',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
    errorMaxFiles: process.env.LOG_ERROR_MAX_FILES || '30d',
    enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
    enableFileRotation: process.env.LOG_ENABLE_FILE_ROTATION !== 'false',
    enableCompression: process.env.LOG_ENABLE_COMPRESSION !== 'false'
};
exports.SYSTEM_PROMPTS = {
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
exports.default = exports.config;
//# sourceMappingURL=index.js.map