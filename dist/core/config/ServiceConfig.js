"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceConfig = void 0;
const Container_1 = require("../di/Container");
const HttpClient_1 = require("../http/HttpClient");
const ErrorHandler_1 = require("../errors/ErrorHandler");
const config_1 = require("../../config");
const logger_1 = require("../../utils/logger");
class ServiceConfig {
    static async initialize() {
        if (ServiceConfig.initialized) {
            return;
        }
        try {
            ServiceConfig.setupErrorHandling();
            ServiceConfig.registerHttpClients();
            await ServiceConfig.registerServices();
            ServiceConfig.initialized = true;
            logger_1.logger.info('Services initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Error initializing services', { error });
            throw error;
        }
    }
    static setupErrorHandling() {
        ErrorHandler_1.errorHandler.onStatusCode(429, async (error) => {
            logger_1.logger.warn('Rate limit exceeded', { error: error.message });
        });
        ErrorHandler_1.errorHandler.onStatusCode(503, async (error) => {
            logger_1.logger.error('Service bancaire indisponible', { error: error.message });
        });
    }
    static registerHttpClients() {
        Container_1.container.register(Container_1.TOKENS.WHATSAPP_HTTP_CLIENT, () => {
            const client = new HttpClient_1.HttpClient(config_1.WHATSAPP_API_BASE_URL, 15000);
            client.setDefaultHeaders({
                'Content-Type': 'application/json',
                'Authorization': () => `Bearer ${config_1.config.whatsapp.accessToken}`,
            });
            return client;
        });
        Container_1.container.register(Container_1.TOKENS.AI_HTTP_CLIENT, () => {
            const client = new HttpClient_1.HttpClient(config_1.config.ai.baseUrl, 30000);
            client.setDefaultHeaders({
                'Content-Type': 'application/json',
                'Authorization': () => `Bearer ${config_1.config.ai.apiKey}`,
            });
            return client;
        });
        Container_1.container.register(Container_1.TOKENS.HTTP_CLIENT, () => {
            return new HttpClient_1.HttpClient();
        });
    }
    static async registerServices() {
        const { WhatsAppService } = await Promise.resolve().then(() => __importStar(require('../../services/whatsappService')));
        const { DatabaseService } = await Promise.resolve().then(() => __importStar(require('../../services/databaseService')));
        const { AIService } = await Promise.resolve().then(() => __importStar(require('../../services/aiService')));
        const { KnowledgeService } = await Promise.resolve().then(() => __importStar(require('../../services/knowledgeService')));
        const { ConversationService } = await Promise.resolve().then(() => __importStar(require('../../services/conversationService')));
        const { ConversationController } = await Promise.resolve().then(() => __importStar(require('../../controllers/conversationController')));
        const { InitializationService } = await Promise.resolve().then(() => __importStar(require('../../services/initializationService')));
        Container_1.container.register(Container_1.TOKENS.WHATSAPP_SERVICE, async () => {
            const httpClient = await Container_1.container.resolve(Container_1.TOKENS.WHATSAPP_HTTP_CLIENT);
            return new WhatsAppService(httpClient);
        });
        Container_1.container.register(Container_1.TOKENS.DATABASE_SERVICE, () => {
            return new DatabaseService();
        });
        Container_1.container.register(Container_1.TOKENS.AI_SERVICE, async () => {
            const httpClient = await Container_1.container.resolve(Container_1.TOKENS.AI_HTTP_CLIENT);
            return new AIService(httpClient);
        });
        Container_1.container.register(Container_1.TOKENS.KNOWLEDGE_SERVICE, async () => {
            const databaseService = await Container_1.container.resolve(Container_1.TOKENS.DATABASE_SERVICE);
            return new KnowledgeService(databaseService);
        });
        Container_1.container.register(Container_1.TOKENS.CONVERSATION_SERVICE, async () => {
            const databaseService = await Container_1.container.resolve(Container_1.TOKENS.DATABASE_SERVICE);
            const aiService = await Container_1.container.resolve(Container_1.TOKENS.AI_SERVICE);
            const knowledgeService = await Container_1.container.resolve(Container_1.TOKENS.KNOWLEDGE_SERVICE);
            return new ConversationService(databaseService, aiService, knowledgeService);
        });
        Container_1.container.register(Container_1.TOKENS.CONVERSATION_CONTROLLER, async () => {
            const conversationService = await Container_1.container.resolve(Container_1.TOKENS.CONVERSATION_SERVICE);
            const whatsappService = await Container_1.container.resolve(Container_1.TOKENS.WHATSAPP_SERVICE);
            return new ConversationController(conversationService, whatsappService);
        });
        Container_1.container.register(Container_1.TOKENS.INITIALIZATION_SERVICE, () => {
            return new InitializationService();
        });
    }
    static async getService(token) {
        if (!ServiceConfig.initialized) {
            await ServiceConfig.initialize();
        }
        return Container_1.container.resolve(token);
    }
    static reset() {
        Container_1.container.clear();
        ServiceConfig.initialized = false;
    }
}
exports.ServiceConfig = ServiceConfig;
ServiceConfig.initialized = false;
//# sourceMappingURL=ServiceConfig.js.map