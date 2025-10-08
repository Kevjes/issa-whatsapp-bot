import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler, requestLogger } from './middlewares/validation';
import { generalRateLimit, adminRateLimit } from './middlewares/rateLimiter';
import whatsappWebhook from './webhooks/whatsappWebhook';
import { ServiceConfig } from './core/config/ServiceConfig';
import { container, TOKENS } from './core';
import { IWhatsAppService } from './core/interfaces/IWhatsAppService';
import { IHttpClient } from './core/interfaces/IHttpClient';
import { InitializationService } from './services/initializationService';

class App {
  public app: Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = config.port;
  }

  /**
   * Initialize the application
   */
  private async initialize(): Promise<void> {
    this.initializeMiddlewares();
    await this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize services with dependency injection
   */
  private async initializeServices(): Promise<void> {
    try {
      // Initialize service configuration (dependency injection container)
      await ServiceConfig.initialize();
      
      // Initialize the new conversation system
      const initService = await container.resolve<InitializationService>(TOKENS.INITIALIZATION_SERVICE);
      const whatsappService = await container.resolve<IWhatsAppService>(TOKENS.WHATSAPP_SERVICE);
      const httpClient = await container.resolve(TOKENS.HTTP_CLIENT) as IHttpClient;
      
      await initService.initialize(httpClient, whatsappService);
      
      logger.info('Services initialized successfully with conversation system');
    } catch (error) {
      logger.error('Error initializing services', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Initialiser les routes du dashboard
   */
  private async initializeDashboardRoutes(): Promise<void> {
    try {
      // Importer les services nécessaires
      const { DatabaseService } = await import('./services/databaseService');

      // Créer les instances des services
      const databaseService = new DatabaseService();
      await databaseService.initialize();
      
      logger.info('Database service initialized successfully');
    } catch (error) {
      logger.error('Error initializing dashboard routes', { 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        errorType: typeof error
      });
      // Ne pas relancer l'erreur pour éviter le crash du serveur
      // throw error;
    }
  }

  /**
   * Initialiser les middlewares
   */
  private initializeMiddlewares(): void {
    // Sécurité
    this.app.use(helmet({
      contentSecurityPolicy: false, // Désactiver CSP pour les webhooks
    }));
    
    // CORS
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] // Remplacer par votre domaine
        : true,
      credentials: true
    }));
    
    // Parsing JSON avec limite de taille
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req: Request, res, buf) => {
        // Stocker le body brut pour la validation de signature
        (req as Request & { rawBody: Buffer }).rawBody = buf;
      }
    }));
    
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Servir les fichiers statiques (pour la page PIN)
    this.app.use('/public', express.static(path.join(__dirname, '../public')));
    
    // Logging des requêtes
    if (config.nodeEnv === 'development') {
      this.app.use(morgan('dev'));
    }
    
    this.app.use(requestLogger);
    
    // Rate limiting général
    this.app.use(generalRateLimit);
    
    // Trust proxy pour obtenir la vraie IP derrière un reverse proxy
    this.app.set('trust proxy', 1);
  }

  /**
   * Initialiser les routes
   */
  private async initializeRoutes(): Promise<void> {
    // Route de base
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        message: 'First Bank Connect Bot API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString()
      });
    });

    // Health check
    this.app.get('/health', async (req: Request, res: Response) => {
      try {
        // Vérifier la santé des services
        const whatsappService = await container.resolve<IWhatsAppService>(TOKENS.WHATSAPP_SERVICE);
        const whatsappHealth = await whatsappService.healthCheck();
        
        const isHealthy = whatsappHealth;
        
        res.status(isHealthy ? 200 : 503).json({
          status: isHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          services: {
          whatsapp: whatsappHealth ? 'healthy' : 'unhealthy',
          menu: 'healthy', // Le système de menu est toujours disponible
          database: 'healthy', // Base de données SQLite
          banking: 'healthy' // Service bancaire
        },
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: '1.0.0'
        });
      } catch (error: unknown) {
        logger.error('Erreur lors du health check', { error: error instanceof Error ? error.message : 'Unknown error' });
        res.status(503).json({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Ping simple
    this.app.get('/ping', (req: Request, res: Response) => {
      res.json({ 
        message: 'pong',
        timestamp: new Date().toISOString()
      });
    });

    // Webhook WhatsApp
    this.app.use('/webhook', whatsappWebhook);

    // Routes administratives (avec rate limiting strict)
    this.app.use('/admin', adminRateLimit);
    
    
    // Initialiser les services du dashboard
     await this.initializeDashboardRoutes();
    
    // Servir les fichiers statiques du dashboard
    this.app.use('/dashboard', express.static(path.join(__dirname, '../public/dashboard')));
    
    // Route spécifique pour la page de login
    this.app.get('/dashboard/login', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, '../public/dashboard/login.html'));
    });
    
    // Route par défaut du dashboard vers index.html
    this.app.get('/dashboard', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, '../public/dashboard/index.html'));
    });
    
    // ISSA Statistics
    this.app.get('/admin/stats', async (req: Request, res: Response) => {
      try {
        const initService = await container.resolve<InitializationService>(TOKENS.INITIALIZATION_SERVICE);
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
      } catch (error) {
        logger.error('Error retrieving system stats', { error });
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    // Informations sur le profil WhatsApp Business
    this.app.get('/admin/profile', async (req: Request, res: Response) => {
      try {
        const whatsappService = await container.resolve<IWhatsAppService>(TOKENS.WHATSAPP_SERVICE);
        const profile = await whatsappService.getBusinessProfile();
        res.json(profile);
      } catch (error: unknown) {
        logger.error('Error retrieving profile', { error: error instanceof Error ? error.message : 'Unknown error' });
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Route 404
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method
      });
    });
  }

  /**
   * Initialiser la gestion d'erreurs
   */
  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  /**
   * Démarrer le serveur
   */
  public async listen(): Promise<void> {
    // Initialiser l'application et les services avant de démarrer le serveur
    await this.initialize();
    await this.initializeServices();
    
    this.app.listen(this.port, () => {
      logger.info(`🚀 Serveur démarré sur le port ${this.port}`);
    });
  }

  /**
   * Arrêt gracieux du serveur
   */
  public gracefulShutdown(): void {
    process.on('SIGTERM', () => {
      logger.info('SIGTERM reçu, arrêt gracieux du serveur...');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT reçu, arrêt gracieux du serveur...');
      process.exit(0);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      process.exit(1);
    });
  }
}

// Créer et démarrer l'application
const app = new App();
app.gracefulShutdown();

// Démarrer le serveur de manière asynchrone
(async () => {
  try {
    await app.listen();
  } catch (error) {
    logger.error('Error starting server', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
})();

export default app.app;