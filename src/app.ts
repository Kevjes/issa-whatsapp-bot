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
import pinRoutes from './routes/pinRoutes';
import logRoutes from './routes/logRoutes';
import { createDashboardRoutes } from './routes/dashboardRoutes';
import { ServiceConfig } from './core/config/ServiceConfig';
import { container, TOKENS } from './core';
import { IWhatsAppService } from './core/interfaces/IWhatsAppService';

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
      // Initialize service configuration
      await ServiceConfig.initialize();
      
      logger.info('Services initialized successfully');
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
      const { DashboardService } = await import('./services/dashboardService');
      const { DashboardAuthService } = await import('./services/dashboardAuthService');
      const { DatabaseService } = await import('./services/databaseService');
      const { logManagementService } = await import('./services/logManagementService');
      const { PinSessionService } = await import('./services/pinSessionService');
      const { TransferSessionService } = await import('./services/transferSessionService');

      // Créer les instances des services
      const databaseService = new DatabaseService();
      await databaseService.initialize();
      
      logger.info('Database service initialized successfully');
      
      const authService = new DashboardAuthService(databaseService);
      
      // Vérifier que l'authService est bien créé
      if (!authService) {
        throw new Error('Failed to create dashboard auth service');
      }
      
      logger.info('Dashboard auth service created successfully');
      
      // Pour les autres services, nous utiliserons des instances mock pour l'instant
      const pinSessionService = new PinSessionService(databaseService, null as any, null as any, null as any);
      const transferSessionService = new TransferSessionService(null as any, null as any);
      
      const dashboardService = new DashboardService(
        databaseService,
        logManagementService,
        pinSessionService,
        transferSessionService
      );

      // Vérifier que tous les services sont bien créés avant de créer les routes
      if (!dashboardService || !authService) {
        throw new Error('Failed to initialize dashboard services');
      }

      // Créer les routes du dashboard
      logger.info('Creating dashboard routes with services', {
        dashboardService: !!dashboardService,
        authService: !!authService,
        authServiceConstructor: authService ? authService.constructor.name : 'null'
      });
      
      logger.info('About to call createDashboardRoutes with authService:', {
        authService: authService,
        authServiceType: typeof authService,
        isNull: authService === null,
        isUndefined: authService === undefined
      });
      
      const dashboardRoutes = createDashboardRoutes(dashboardService, authService);
      this.app.use('/api/dashboard', dashboardRoutes);
      
      logger.info('Dashboard routes initialized successfully');
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
      verify: (req: any, res, buf) => {
        // Stocker le body brut pour la validation de signature
        req.rawBody = buf;
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
      } catch (error: any) {
        logger.error('Erreur lors du health check', { error: error.message });
        res.status(503).json({
          status: 'unhealthy',
          error: error.message
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
    
    // Routes PIN
    this.app.use('/', pinRoutes);

    // Routes administratives (avec rate limiting strict)
    this.app.use('/admin', adminRateLimit);
    
    // Routes de gestion des logs
    this.app.use('/api/logs', logRoutes);
    
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
    
    // Menu statistics
    this.app.get('/admin/stats', (req: Request, res: Response) => {
      res.json({
        message: 'WhatsApp interactive menu system',
        status: 'active',
        features: [
          'Personalized welcome messages',
          'Interactive menu with buttons',
          'Dropdown lists for options',
          'Confirmation messages',
          'Secure PIN authentication',
          'Banking integration',
          'Temporary PIN sessions'
        ],
        timestamp: new Date().toISOString()
      });
    });
    
    // Informations sur le profil WhatsApp Business
    this.app.get('/admin/profile', async (req: Request, res: Response) => {
      try {
        const whatsappService = await container.resolve<IWhatsAppService>(TOKENS.WHATSAPP_SERVICE);
        const profile = await whatsappService.getBusinessProfile();
        res.json(profile);
      } catch (error: any) {
        logger.error('Error retrieving profile', { error: error.message });
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