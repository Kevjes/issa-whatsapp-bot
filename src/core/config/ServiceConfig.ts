import { container, TOKENS } from '../di/Container';
import { HttpClient } from '../http/HttpClient';
import { errorHandler } from '../errors/ErrorHandler';
import { config, WHATSAPP_API_BASE_URL } from '../../config';
import { logger } from '../../utils/logger';
import { IHttpClient } from '../interfaces/IHttpClient';
import { IWhatsAppService } from '../interfaces/IWhatsAppService';

/**
 * Configuration et initialisation des services
 */
export class ServiceConfig {
  private static initialized = false;

  /**
   * Initialiser tous les services dans le container
   */
  public static async initialize(): Promise<void> {
    if (ServiceConfig.initialized) {
      return;
    }

    try {
      // Configurer le gestionnaire d'erreurs
      ServiceConfig.setupErrorHandling();

      // Enregistrer les clients HTTP
      ServiceConfig.registerHttpClients();

      // Enregistrer les services
      await ServiceConfig.registerServices();

      ServiceConfig.initialized = true;
      logger.info('Services initialized successfully');
    } catch (error) {
      logger.error('Error initializing services', { error });
      throw error;
    }
  }

  /**
   * Configurer la gestion d'erreurs globale
   */
  private static setupErrorHandling(): void {
    // Callback for 429 (rate limiting)
    errorHandler.onStatusCode(429, async (error) => {
      logger.warn('Rate limit exceeded', { error: error.message });
      // Here we could implement a retry logic with backoff
    });

    // Callback for 503 (service unavailable)
    errorHandler.onStatusCode(503, async (error) => {
      logger.error('Service bancaire indisponible', { error: error.message });
      // Ici on pourrait notifier les administrateurs
    });
  }

  /**
   * Enregistrer les clients HTTP avec leurs configurations spécifiques
   */
  private static registerHttpClients(): void {
    // Client HTTP pour WhatsApp
    container.register(TOKENS.WHATSAPP_HTTP_CLIENT, () => {
      const client = new HttpClient(WHATSAPP_API_BASE_URL, 15000);
      
      // Headers par défaut pour WhatsApp
      client.setDefaultHeaders({
        'Content-Type': 'application/json',
        'Authorization': () => `Bearer ${config.whatsapp.accessToken}`,
      });

      return client;
    });

    // Client HTTP générique
    container.register(TOKENS.HTTP_CLIENT, () => {
      return new HttpClient();
    });
  }

  /**
   * Enregistrer tous les services
   */
  private static async registerServices(): Promise<void> {
    // Importer les services de manière dynamique pour éviter les dépendances circulaires
    const { WhatsAppService } = await import('../../services/whatsappService');
    const { DatabaseService } = await import('../../services/databaseService');
    const { MenuService } = await import('../../services/menuService');
    const { MenuController } = await import('../../controllers/menuController');
    const { MessageController } = await import('../../controllers/messageController');

    // Service WhatsApp
    container.register(TOKENS.WHATSAPP_SERVICE, async () => {
      const httpClient = await container.resolve<IHttpClient>(TOKENS.WHATSAPP_HTTP_CLIENT);
      return new WhatsAppService(httpClient);
    });

    // Service de base de données
    container.register(TOKENS.DATABASE_SERVICE, () => {
      return new DatabaseService();
    });

    // Service de menu
    container.register(TOKENS.MENU_SERVICE, async () => {
      const whatsappService = await container.resolve<IWhatsAppService>(TOKENS.WHATSAPP_SERVICE);
      return new MenuService(whatsappService as any);
    });

    // Contrôleur de menu
    container.register(TOKENS.MENU_CONTROLLER, async () => {
      const whatsappService = await container.resolve<IWhatsAppService>(TOKENS.WHATSAPP_SERVICE);
      const menuService = await container.resolve(TOKENS.MENU_SERVICE);
      return new MenuController(whatsappService as any, menuService as any);
    });

    // Contrôleur de messages
    container.register(TOKENS.MESSAGE_CONTROLLER, async () => {
      return new MessageController();
    });
  }

  /**
   * Obtenir un service du container
   */
  public static async getService<T>(token: string | symbol): Promise<T> {
    if (!ServiceConfig.initialized) {
      await ServiceConfig.initialize();
    }
    return container.resolve<T>(token);
  }

  /**
   * Réinitialiser la configuration (utile pour les tests)
   */
  public static reset(): void {
    container.clear();
    ServiceConfig.initialized = false;
  }
}