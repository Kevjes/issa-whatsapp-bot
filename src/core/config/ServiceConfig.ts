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

    // Client HTTP pour l'IA
    container.register(TOKENS.AI_HTTP_CLIENT, () => {
      const client = new HttpClient(config.ai.baseUrl, 30000);
      
      // Headers par défaut pour l'IA
      client.setDefaultHeaders({
        'Content-Type': 'application/json',
        'Authorization': () => `Bearer ${config.ai.apiKey}`,
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

    // Nouveaux services
    const { AIService } = await import('../../services/aiService');
    const { KnowledgeService } = await import('../../services/knowledgeService');
    const { ConversationService } = await import('../../services/conversationService');
    const { ConversationController } = await import('../../controllers/conversationController');
    const { InitializationService } = await import('../../services/initializationService');

    // Services de la refonte chat-review
    const { WorkflowEngine } = await import('../../services/workflowEngine');
    const { IntentClassifier } = await import('../../services/intentClassifier');
    const { ValidationService } = await import('../../services/validationService');
    const { EnhancedKnowledgeService } = await import('../../services/enhancedKnowledgeService');
    const { VectorSearchService } = await import('../../services/vectorSearchService');
    const { workflows, workflowHandlers } = await import('../../workflows');

    // Service WhatsApp
    container.register(TOKENS.WHATSAPP_SERVICE, async () => {
      const httpClient = await container.resolve<IHttpClient>(TOKENS.WHATSAPP_HTTP_CLIENT);
      return new WhatsAppService(httpClient);
    });

    // Service de base de données
    container.register(TOKENS.DATABASE_SERVICE, () => {
      return new DatabaseService();
    });

    // Service IA
    container.register(TOKENS.AI_SERVICE, async () => {
      const httpClient = await container.resolve<IHttpClient>(TOKENS.AI_HTTP_CLIENT);
      return new AIService(httpClient);
    });

    // Service de base de connaissances (legacy - toujours nécessaire)
    container.register(TOKENS.KNOWLEDGE_SERVICE, async () => {
      const databaseService = await container.resolve(TOKENS.DATABASE_SERVICE);
      return new KnowledgeService(databaseService as InstanceType<typeof DatabaseService>);
    });

    // === Services de la refonte chat-review (enregistrés avant ConversationService) ===

    // Validation Service
    container.register(TOKENS.VALIDATION_SERVICE, () => {
      return new ValidationService();
    });

    // Intent Classifier
    container.register(TOKENS.INTENT_CLASSIFIER, () => {
      return new IntentClassifier();
    });

    // Vector Search Service
    container.register(TOKENS.VECTOR_SEARCH_SERVICE, async () => {
      const vectorService = new VectorSearchService();
      await vectorService.initialize();
      logger.info('VectorSearchService initialized in DI container');
      return vectorService;
    });

    // Enhanced Knowledge Service
    container.register(TOKENS.ENHANCED_KNOWLEDGE_SERVICE, async () => {
      const databaseService = await container.resolve(TOKENS.DATABASE_SERVICE);
      const vectorSearchService = await container.resolve(TOKENS.VECTOR_SEARCH_SERVICE);
      return new EnhancedKnowledgeService(
        databaseService as InstanceType<typeof DatabaseService>,
        vectorSearchService as InstanceType<typeof VectorSearchService>
      );
    });

    // Workflow Engine
    container.register(TOKENS.WORKFLOW_ENGINE, async () => {
      const databaseService = await container.resolve(TOKENS.DATABASE_SERVICE);
      const workflowEngine = new WorkflowEngine(databaseService as InstanceType<typeof DatabaseService>);

      // Enregistrer tous les workflows
      for (const workflow of workflows) {
        workflowEngine.registerWorkflow(workflow);
      }

      // Enregistrer tous les handlers
      for (const handler of workflowHandlers) {
        workflowEngine.registerHandler(handler);
      }

      logger.info('Workflow engine initialized with workflows and handlers', {
        workflowsCount: workflows.length,
        handlersCount: workflowHandlers.length
      });

      return workflowEngine;
    });

    // Service de conversation (utilise les nouveaux services)
    container.register(TOKENS.CONVERSATION_SERVICE, async () => {
      const databaseService = await container.resolve(TOKENS.DATABASE_SERVICE);
      const aiService = await container.resolve(TOKENS.AI_SERVICE);
      const workflowEngine = await container.resolve(TOKENS.WORKFLOW_ENGINE);
      const intentClassifier = await container.resolve(TOKENS.INTENT_CLASSIFIER);
      const knowledgeService = await container.resolve(TOKENS.ENHANCED_KNOWLEDGE_SERVICE);
      return new ConversationService(
        databaseService as InstanceType<typeof DatabaseService>,
        aiService as InstanceType<typeof AIService>,
        workflowEngine as InstanceType<typeof WorkflowEngine>,
        intentClassifier as InstanceType<typeof IntentClassifier>,
        knowledgeService as InstanceType<typeof EnhancedKnowledgeService>
      );
    });

    // Contrôleur de conversation
    container.register(TOKENS.CONVERSATION_CONTROLLER, async () => {
      const conversationService = await container.resolve(TOKENS.CONVERSATION_SERVICE);
      const whatsappService = await container.resolve<IWhatsAppService>(TOKENS.WHATSAPP_SERVICE);
      return new ConversationController(
        conversationService as InstanceType<typeof ConversationService>,
        whatsappService
      );
    });

    // Service d'initialisation
    container.register(TOKENS.INITIALIZATION_SERVICE, () => {
      return new InitializationService();
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