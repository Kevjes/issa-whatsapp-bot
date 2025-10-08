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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const validation_1 = require("./middlewares/validation");
const rateLimiter_1 = require("./middlewares/rateLimiter");
const whatsappWebhook_1 = __importDefault(require("./webhooks/whatsappWebhook"));
const ServiceConfig_1 = require("./core/config/ServiceConfig");
const core_1 = require("./core");
class App {
    constructor() {
        this.app = (0, express_1.default)();
        this.port = config_1.config.port;
    }
    async initialize() {
        this.initializeMiddlewares();
        await this.initializeRoutes();
        this.initializeErrorHandling();
    }
    async initializeServices() {
        try {
            await ServiceConfig_1.ServiceConfig.initialize();
            const initService = await core_1.container.resolve(core_1.TOKENS.INITIALIZATION_SERVICE);
            const whatsappService = await core_1.container.resolve(core_1.TOKENS.WHATSAPP_SERVICE);
            const httpClient = await core_1.container.resolve(core_1.TOKENS.HTTP_CLIENT);
            await initService.initialize(httpClient, whatsappService);
            logger_1.logger.info('Services initialized successfully with conversation system');
        }
        catch (error) {
            logger_1.logger.error('Error initializing services', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async initializeDashboardRoutes() {
        try {
            const { DatabaseService } = await Promise.resolve().then(() => __importStar(require('./services/databaseService')));
            const databaseService = new DatabaseService();
            await databaseService.initialize();
            logger_1.logger.info('Database service initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Error initializing dashboard routes', {
                error: error instanceof Error ? error.message : error,
                stack: error instanceof Error ? error.stack : undefined,
                errorType: typeof error
            });
        }
    }
    initializeMiddlewares() {
        this.app.use((0, helmet_1.default)({
            contentSecurityPolicy: false,
        }));
        this.app.use((0, cors_1.default)({
            origin: process.env.NODE_ENV === 'production'
                ? ['https://yourdomain.com']
                : true,
            credentials: true
        }));
        this.app.use(express_1.default.json({
            limit: '10mb',
            verify: (req, res, buf) => {
                req.rawBody = buf;
            }
        }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        this.app.use('/public', express_1.default.static(path_1.default.join(__dirname, '../public')));
        if (config_1.config.nodeEnv === 'development') {
            this.app.use((0, morgan_1.default)('dev'));
        }
        this.app.use(validation_1.requestLogger);
        this.app.use(rateLimiter_1.generalRateLimit);
        this.app.set('trust proxy', 1);
    }
    async initializeRoutes() {
        this.app.get('/', (req, res) => {
            res.json({
                message: 'First Bank Connect Bot API',
                version: '1.0.0',
                status: 'running',
                timestamp: new Date().toISOString()
            });
        });
        this.app.get('/health', async (req, res) => {
            try {
                const whatsappService = await core_1.container.resolve(core_1.TOKENS.WHATSAPP_SERVICE);
                const whatsappHealth = await whatsappService.healthCheck();
                const isHealthy = whatsappHealth;
                res.status(isHealthy ? 200 : 503).json({
                    status: isHealthy ? 'healthy' : 'unhealthy',
                    timestamp: new Date().toISOString(),
                    services: {
                        whatsapp: whatsappHealth ? 'healthy' : 'unhealthy',
                        menu: 'healthy',
                        database: 'healthy',
                        banking: 'healthy'
                    },
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    version: '1.0.0'
                });
            }
            catch (error) {
                logger_1.logger.error('Erreur lors du health check', { error: error instanceof Error ? error.message : 'Unknown error' });
                res.status(503).json({
                    status: 'unhealthy',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
        this.app.get('/ping', (req, res) => {
            res.json({
                message: 'pong',
                timestamp: new Date().toISOString()
            });
        });
        this.app.use('/webhook', whatsappWebhook_1.default);
        this.app.use('/admin', rateLimiter_1.adminRateLimit);
        await this.initializeDashboardRoutes();
        this.app.use('/dashboard', express_1.default.static(path_1.default.join(__dirname, '../public/dashboard')));
        this.app.get('/dashboard/login', (req, res) => {
            res.sendFile(path_1.default.join(__dirname, '../public/dashboard/login.html'));
        });
        this.app.get('/dashboard', (req, res) => {
            res.sendFile(path_1.default.join(__dirname, '../public/dashboard/index.html'));
        });
        this.app.get('/admin/stats', async (req, res) => {
            try {
                const initService = await core_1.container.resolve(core_1.TOKENS.INITIALIZATION_SERVICE);
                const systemStats = await initService.getSystemStats();
                res.json({
                    message: 'ISSA - Assistant virtuel Royal Onyx Insurance',
                    status: 'active',
                    features: [
                        'Conversations naturelles avec IA (OpenAI/DeepSeek)',
                        'Sauvegarde historique conversations',
                        'Base de connaissances ROI et ROI Takaful',
                        'Gestion des utilisateurs personnalisée',
                        'Collecte automatique des noms',
                        'Réponses contextuelles intelligentes'
                    ],
                    systemStats,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                logger_1.logger.error('Error retrieving system stats', { error });
                res.status(500).json({ error: 'Internal server error' });
            }
        });
        this.app.get('/admin/profile', async (req, res) => {
            try {
                const whatsappService = await core_1.container.resolve(core_1.TOKENS.WHATSAPP_SERVICE);
                const profile = await whatsappService.getBusinessProfile();
                res.json(profile);
            }
            catch (error) {
                logger_1.logger.error('Error retrieving profile', { error: error instanceof Error ? error.message : 'Unknown error' });
                res.status(500).json({ error: 'Internal server error' });
            }
        });
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Route not found',
                path: req.originalUrl,
                method: req.method
            });
        });
    }
    initializeErrorHandling() {
        this.app.use(validation_1.errorHandler);
    }
    async listen() {
        await this.initialize();
        await this.initializeServices();
        this.app.listen(this.port, () => {
            logger_1.logger.info(`🚀 Serveur démarré sur le port ${this.port}`);
        });
    }
    gracefulShutdown() {
        process.on('SIGTERM', () => {
            logger_1.logger.info('SIGTERM reçu, arrêt gracieux du serveur...');
            process.exit(0);
        });
        process.on('SIGINT', () => {
            logger_1.logger.info('SIGINT reçu, arrêt gracieux du serveur...');
            process.exit(0);
        });
        process.on('uncaughtException', (error) => {
            logger_1.logger.error('Uncaught exception', { error: error.message, stack: error.stack });
            process.exit(1);
        });
        process.on('unhandledRejection', (reason, promise) => {
            logger_1.logger.error('Unhandled rejection', { reason, promise });
            process.exit(1);
        });
    }
}
const app = new App();
app.gracefulShutdown();
(async () => {
    try {
        await app.listen();
    }
    catch (error) {
        logger_1.logger.error('Error starting server', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        process.exit(1);
    }
})();
exports.default = app.app;
//# sourceMappingURL=app.js.map