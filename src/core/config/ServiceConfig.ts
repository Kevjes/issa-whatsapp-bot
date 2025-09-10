import { container, TOKENS } from '../di/Container';
import { HttpClient } from '../http/HttpClient';
import { errorHandler } from '../errors/ErrorHandler';
import { config, WHATSAPP_API_BASE_URL } from '../../config';
import { logger } from '../../utils/logger';
import { IHttpClient } from '../interfaces/IHttpClient';
import { IBankingAuthService } from '../interfaces/IBankingAuthService';
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
    // Callback pour les erreurs 401 (token expiré)
      errorHandler.onStatusCode(401, async (error) => {
        logger.warn('Token expired detected, renewal attempt', { error: error.message });
        
        // Ici on pourrait déclencher un renouvellement automatique du token
        // Par exemple, invalider le cache du token dans bankingAuthService
        try {
          const authService = await container.resolve<IBankingAuthService>(TOKENS.BANKING_AUTH_SERVICE);
          if (authService && typeof authService.invalidateToken === 'function') {
            await authService.invalidateToken();
          }
        } catch (authError) {
          logger.error('Error invalidating token', { authError });
        }
      });

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

    // Client HTTP pour l'API bancaire
    container.register(TOKENS.BANKING_HTTP_CLIENT, () => {
      const client = new HttpClient(config.banking.apiUrl, 30000, true); // Ignorer les erreurs SSL
      
      // Headers par défaut pour l'API bancaire (sans token automatique pour éviter la dépendance circulaire)
      client.setDefaultHeaders({
        'Content-Type': 'application/json',
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
    const { BankingAuthService } = await import('../../services/bankingAuthService');
    const { BankingService } = await import('../../services/bankingService');
    const { WhatsAppService } = await import('../../services/whatsappService');
    const { PinSessionService } = await import('../../services/pinSessionService');
    const { TransferSessionService } = await import('../../services/transferSessionService');
    const { DatabaseService } = await import('../../services/databaseService');
    const { MenuService } = await import('../../services/menuService');
    const { MenuController } = await import('../../controllers/menuController');
    const { MessageController } = await import('../../controllers/messageController');

    // Service d'authentification bancaire
    container.register(TOKENS.BANKING_AUTH_SERVICE, async () => {
      const httpClient = await container.resolve<IHttpClient>(TOKENS.BANKING_HTTP_CLIENT);
      const databaseService = await container.resolve(TOKENS.DATABASE_SERVICE);
      return new BankingAuthService(httpClient, databaseService as any);
    });

    // Service bancaire
    container.register(TOKENS.BANKING_SERVICE, async () => {
      const httpClient = await container.resolve<IHttpClient>(TOKENS.BANKING_HTTP_CLIENT);
      const authService = await container.resolve<IBankingAuthService>(TOKENS.BANKING_AUTH_SERVICE);
      return new BankingService(httpClient, authService);
    });

    // Service WhatsApp
    container.register(TOKENS.WHATSAPP_SERVICE, async () => {
      const httpClient = await container.resolve<IHttpClient>(TOKENS.WHATSAPP_HTTP_CLIENT);
      return new WhatsAppService(httpClient);
    });

    // Service de sessions de transfert
    container.register(TOKENS.TRANSFER_SESSION_SERVICE, async () => {
      const bankingService = await container.resolve(TOKENS.BANKING_SERVICE);
      const whatsappService = await container.resolve<IWhatsAppService>(TOKENS.WHATSAPP_SERVICE);
      return new TransferSessionService(bankingService as any, whatsappService);
    });

    // Service de sessions PIN
    container.register(TOKENS.PIN_SESSION_SERVICE, async () => {
      const databaseService = await container.resolve(TOKENS.DATABASE_SERVICE);
      const bankingService = await container.resolve(TOKENS.BANKING_SERVICE);
      const whatsappService = await container.resolve<IWhatsAppService>(TOKENS.WHATSAPP_SERVICE);
      const transferSessionService = await container.resolve(TOKENS.TRANSFER_SESSION_SERVICE);
      return new PinSessionService(databaseService as any, bankingService as any, whatsappService, transferSessionService as any);
    });

    // Service de base de données
    container.register(TOKENS.DATABASE_SERVICE, () => {
      return new DatabaseService();
    });

    // Service de menu
    container.register(TOKENS.MENU_SERVICE, async () => {
      const pinSessionService = await container.resolve(TOKENS.PIN_SESSION_SERVICE);
      const whatsappService = await container.resolve<IWhatsAppService>(TOKENS.WHATSAPP_SERVICE);
      return new MenuService(pinSessionService as any, whatsappService);
    });

    // Contrôleur de menu
    container.register(TOKENS.MENU_CONTROLLER, async () => {
      const whatsappService = await container.resolve<IWhatsAppService>(TOKENS.WHATSAPP_SERVICE);
      const menuService = await container.resolve(TOKENS.MENU_SERVICE);
      const pinSessionService = await container.resolve(TOKENS.PIN_SESSION_SERVICE);
      const transferSessionService = await container.resolve(TOKENS.TRANSFER_SESSION_SERVICE);
      return new MenuController(whatsappService as any, menuService as any, transferSessionService as any);
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