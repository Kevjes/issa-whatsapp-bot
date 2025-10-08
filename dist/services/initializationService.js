"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitializationService = void 0;
const databaseService_1 = require("./databaseService");
const knowledgeService_1 = require("./knowledgeService");
const aiService_1 = require("./aiService");
const conversationService_1 = require("./conversationService");
const conversationController_1 = require("../controllers/conversationController");
const logger_1 = require("../utils/logger");
class InitializationService {
    constructor() {
        this.databaseService = new databaseService_1.DatabaseService();
    }
    async initialize(httpClient, whatsappService) {
        try {
            logger_1.logger.info('Démarrage de l\'initialisation des services...');
            await this.initializeDatabase();
            this.aiService = new aiService_1.AIService(httpClient);
            this.knowledgeService = new knowledgeService_1.KnowledgeService(this.databaseService);
            await this.initializeKnowledgeBase();
            this.conversationService = new conversationService_1.ConversationService(this.databaseService, this.aiService, this.knowledgeService);
            this.conversationController = new conversationController_1.ConversationController(this.conversationService, whatsappService);
            logger_1.logger.info('Initialisation des services terminée avec succès');
            return {
                conversationController: this.conversationController,
                databaseService: this.databaseService,
                aiService: this.aiService,
                knowledgeService: this.knowledgeService,
                conversationService: this.conversationService
            };
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de l\'initialisation des services', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            throw error;
        }
    }
    async initializeDatabase() {
        try {
            logger_1.logger.info('Initialisation de la base de données...');
            await this.databaseService.initialize();
            logger_1.logger.info('Base de données initialisée avec succès');
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de l\'initialisation de la base de données', { error });
            throw error;
        }
    }
    async initializeKnowledgeBase() {
        try {
            logger_1.logger.info('Initialisation de la base de connaissances...');
            await this.knowledgeService.initializeKnowledgeBase();
            logger_1.logger.info('Base de connaissances initialisée avec succès');
            logger_1.logger.info('Pré-chargement du cache...');
            await this.knowledgeService.warmupCache();
            logger_1.logger.info('Cache pré-chargé avec succès', {
                cacheStats: this.knowledgeService.getCacheStats()
            });
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de l\'initialisation de la base de connaissances', { error });
            logger_1.logger.warn('Continuant sans base de connaissances...');
        }
    }
    async healthCheck() {
        const health = {
            database: false,
            ai: false,
            knowledgeBase: false,
            overall: false
        };
        try {
            await this.databaseService.getActiveUsers();
            health.database = true;
            logger_1.logger.debug('Health check - Base de données: OK');
        }
        catch (error) {
            logger_1.logger.error('Health check - Base de données: ERREUR', { error });
        }
        try {
            const config = this.aiService.getConfig();
            health.ai = !!config.apiKey;
            logger_1.logger.debug('Health check - IA: OK', { provider: config.provider });
        }
        catch (error) {
            logger_1.logger.error('Health check - IA: ERREUR', { error });
        }
        try {
            const results = await this.knowledgeService.search('roi');
            health.knowledgeBase = results.length > 0;
            logger_1.logger.debug('Health check - Base de connaissances: OK', { entriesFound: results.length });
        }
        catch (error) {
            logger_1.logger.error('Health check - Base de connaissances: ERREUR', { error });
        }
        health.overall = health.database && health.ai;
        return health;
    }
    async cleanup() {
        try {
            logger_1.logger.info('Nettoyage des ressources...');
            if (this.databaseService) {
                await this.databaseService.close();
            }
            logger_1.logger.info('Nettoyage terminé');
        }
        catch (error) {
            logger_1.logger.error('Erreur lors du nettoyage', { error });
        }
    }
    async getSystemStats() {
        try {
            const stats = {
                timestamp: new Date().toISOString(),
                services: {
                    database: false,
                    ai: false,
                    knowledgeBase: false
                }
            };
            try {
                const activeUsers = await this.databaseService.getActiveUsers();
                stats.activeUsers = activeUsers.length;
                stats.services.database = true;
            }
            catch (error) {
                logger_1.logger.error('Erreur récupération stats BD', { error });
            }
            try {
                const aiConfig = this.aiService.getConfig();
                stats.aiProvider = aiConfig.provider;
                stats.aiModel = aiConfig.model;
                stats.services.ai = true;
            }
            catch (error) {
                logger_1.logger.error('Erreur récupération stats IA', { error });
            }
            try {
                const roiEntries = await this.knowledgeService.search('roi');
                const takafulEntries = await this.knowledgeService.search('takaful');
                const cacheStats = this.knowledgeService.getCacheStats();
                stats.knowledgeEntries = {
                    roi: roiEntries.length,
                    takaful: takafulEntries.length,
                    total: roiEntries.length + takafulEntries.length
                };
                stats.cacheStats = {
                    keys: cacheStats.keys,
                    hits: cacheStats.hits,
                    misses: cacheStats.misses,
                    hitRate: cacheStats.hits + cacheStats.misses > 0
                        ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(2) + '%'
                        : '0%'
                };
                stats.services.knowledgeBase = true;
            }
            catch (error) {
                logger_1.logger.error('Erreur récupération stats base de connaissances', { error });
            }
            return stats;
        }
        catch (error) {
            logger_1.logger.error('Erreur récupération statistiques système', { error });
            return {
                error: 'Failed to retrieve system stats',
                timestamp: new Date().toISOString()
            };
        }
    }
}
exports.InitializationService = InitializationService;
//# sourceMappingURL=initializationService.js.map