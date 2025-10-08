import { DatabaseService } from './databaseService';
import { KnowledgeService } from './knowledgeService';
import { AIService } from './aiService';
import { ConversationService } from './conversationService';
import { ConversationController } from '../controllers/conversationController';
import { IWhatsAppService } from '../core/interfaces/IWhatsAppService';
import { IHttpClient } from '../core/interfaces/IHttpClient';
import { logger } from '../utils/logger';

export class InitializationService {
  private databaseService: DatabaseService;
  private knowledgeService!: KnowledgeService;
  private aiService!: AIService;
  private conversationService!: ConversationService;
  private conversationController!: ConversationController;

  constructor() {
    // Les services seront initialisés dans la méthode initialize
    this.databaseService = new DatabaseService();
  }

  /**
   * Initialiser tous les services de l'application
   */
  async initialize(httpClient: IHttpClient, whatsappService: IWhatsAppService): Promise<{
    conversationController: ConversationController;
    databaseService: DatabaseService;
    aiService: AIService;
    knowledgeService: KnowledgeService;
    conversationService: ConversationService;
  }> {
    try {
      logger.info('Démarrage de l\'initialisation des services...');

      // 1. Initialiser la base de données
      await this.initializeDatabase();

      // 2. Initialiser le service IA
      this.aiService = new AIService(httpClient);

      // 3. Initialiser le service de base de connaissances
      this.knowledgeService = new KnowledgeService(this.databaseService);

      // 4. Charger la base de connaissances ROI
      await this.initializeKnowledgeBase();

      // 5. Initialiser le service de conversation
      this.conversationService = new ConversationService(
        this.databaseService,
        this.aiService,
        this.knowledgeService
      );

      // 6. Initialiser le contrôleur de conversation
      this.conversationController = new ConversationController(
        this.conversationService,
        whatsappService
      );

      logger.info('Initialisation des services terminée avec succès');

      return {
        conversationController: this.conversationController,
        databaseService: this.databaseService,
        aiService: this.aiService,
        knowledgeService: this.knowledgeService,
        conversationService: this.conversationService
      };

    } catch (error) {
      logger.error('Erreur lors de l\'initialisation des services', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Initialiser la base de données
   */
  private async initializeDatabase(): Promise<void> {
    try {
      logger.info('Initialisation de la base de données...');
      await this.databaseService.initialize();
      logger.info('Base de données initialisée avec succès');
    } catch (error) {
      logger.error('Erreur lors de l\'initialisation de la base de données', { error });
      throw error;
    }
  }

  /**
   * Initialiser la base de connaissances
   */
  private async initializeKnowledgeBase(): Promise<void> {
    try {
      logger.info('Initialisation de la base de connaissances...');
      await this.knowledgeService.initializeKnowledgeBase();
      logger.info('Base de connaissances initialisée avec succès');

      // Pré-charger le cache avec les requêtes fréquentes
      logger.info('Pré-chargement du cache...');
      await this.knowledgeService.warmupCache();
      logger.info('Cache pré-chargé avec succès', {
        cacheStats: this.knowledgeService.getCacheStats()
      });

    } catch (error) {
      logger.error('Erreur lors de l\'initialisation de la base de connaissances', { error });
      // Ne pas faire échouer l'initialisation si la base de connaissances échoue
      logger.warn('Continuant sans base de connaissances...');
    }
  }

  /**
   * Vérifier l'état des services
   */
  async healthCheck(): Promise<{
    database: boolean;
    ai: boolean;
    knowledgeBase: boolean;
    overall: boolean;
  }> {
    const health = {
      database: false,
      ai: false,
      knowledgeBase: false,
      overall: false
    };

    try {
      // Vérifier la base de données
      await this.databaseService.getActiveUsers();
      health.database = true;
      logger.debug('Health check - Base de données: OK');
    } catch (error) {
      logger.error('Health check - Base de données: ERREUR', { error });
    }

    try {
      // Vérifier l'IA
      const config = this.aiService.getConfig();
      health.ai = !!config.apiKey;
      logger.debug('Health check - IA: OK', { provider: config.provider });
    } catch (error) {
      logger.error('Health check - IA: ERREUR', { error });
    }

    try {
      // Vérifier la base de connaissances
      const results = await this.knowledgeService.search('roi');
      health.knowledgeBase = results.length > 0;
      logger.debug('Health check - Base de connaissances: OK', { entriesFound: results.length });
    } catch (error) {
      logger.error('Health check - Base de connaissances: ERREUR', { error });
    }

    health.overall = health.database && health.ai;

    return health;
  }

  /**
   * Nettoyer les ressources au shutdown
   */
  async cleanup(): Promise<void> {
    try {
      logger.info('Nettoyage des ressources...');

      // Fermer la base de données
      if (this.databaseService) {
        await this.databaseService.close();
      }

      logger.info('Nettoyage terminé');
    } catch (error) {
      logger.error('Erreur lors du nettoyage', { error });
    }
  }

  /**
   * Obtenir les statistiques du système
   */
  async getSystemStats(): Promise<Record<string, unknown>> {
    try {
      const stats: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        services: {
          database: false,
          ai: false,
          knowledgeBase: false
        }
      };

      // Statistiques de base de données
      try {
        const activeUsers = await this.databaseService.getActiveUsers();
        stats.activeUsers = activeUsers.length;
        (stats.services as Record<string, boolean>).database = true;
      } catch (error) {
        logger.error('Erreur récupération stats BD', { error });
      }

      // Statistiques IA
      try {
        const aiConfig = this.aiService.getConfig();
        stats.aiProvider = aiConfig.provider;
        stats.aiModel = aiConfig.model;
        (stats.services as Record<string, boolean>).ai = true;
      } catch (error) {
        logger.error('Erreur récupération stats IA', { error });
      }

      // Statistiques base de connaissances
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

        (stats.services as Record<string, boolean>).knowledgeBase = true;
      } catch (error) {
        logger.error('Erreur récupération stats base de connaissances', { error });
      }

      return stats;
    } catch (error) {
      logger.error('Erreur récupération statistiques système', { error });
      return {
        error: 'Failed to retrieve system stats',
        timestamp: new Date().toISOString()
      };
    }
  }
}