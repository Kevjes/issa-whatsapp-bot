import { User, ConversationContext, AIResponse } from '../types';
import { WorkflowContext, WorkflowStepResult, WorkflowStatus } from '../types/workflow';
import { DatabaseService } from './databaseService';
import { AIService } from './aiService';
import { WorkflowEngine } from './workflowEngine';
import { IntentClassifier } from './intentClassifier';
import { EnhancedKnowledgeService } from './enhancedKnowledgeService';
import { logger } from '../utils/logger';

/**
 * ConversationService - Service principal de gestion des conversations
 * Architecture: Application Layer (Clean Architecture)
 *
 * Responsabilités:
 * - Orchestration des workflows via WorkflowEngine
 * - Classification des intentions via IntentClassifier
 * - Recherche de contexte via EnhancedKnowledgeService
 * - Intégration avec AI pour les réponses génératives
 */
export class ConversationService {
  private databaseService: DatabaseService;
  private aiService: AIService;
  private workflowEngine: WorkflowEngine;
  private intentClassifier: IntentClassifier;
  private knowledgeService: EnhancedKnowledgeService;

  constructor(
    databaseService: DatabaseService,
    aiService: AIService,
    workflowEngine: WorkflowEngine,
    intentClassifier: IntentClassifier,
    knowledgeService: EnhancedKnowledgeService
  ) {
    this.databaseService = databaseService;
    this.aiService = aiService;
    this.workflowEngine = workflowEngine;
    this.intentClassifier = intentClassifier;
    this.knowledgeService = knowledgeService;
  }

  /**
   * Traiter un message entrant et générer une réponse
   */
  async processMessage(
    phoneNumber: string,
    messageId: string,
    userMessage: string
  ): Promise<{ response: string; shouldContinue: boolean }> {
    try {
      logger.info('Traitement du message', {
        phoneNumber,
        messageId,
        messageLength: userMessage.length
      });

      // Obtenir ou créer l'utilisateur
      const user = await this.databaseService.getOrCreateUser(phoneNumber);

      // Sauvegarder le message utilisateur
      await this.databaseService.saveConversationMessage({
        userId: user.id!,
        phoneNumber,
        messageId,
        content: userMessage,
        messageType: 'user',
        timestamp: new Date().toISOString()
      });

      // Vérifier si l'utilisateur est dans un workflow actif
      const activeWorkflow = await this.workflowEngine.getActiveWorkflow(user.id!);

      let response: string;

      if (activeWorkflow) {
        // L'utilisateur est dans un workflow, continuer son exécution
        response = await this.handleWorkflowStep(user, activeWorkflow, userMessage, messageId);
      } else {
        // Pas de workflow actif, déterminer le comportement
        response = await this.handleNoActiveWorkflow(user, userMessage, messageId);
      }

      // Nettoyer le formatage Markdown avant l'envoi
      const cleanResponse = this.cleanMarkdownForWhatsApp(response);

      // Sauvegarder la réponse du bot
      await this.databaseService.saveConversationMessage({
        userId: user.id!,
        phoneNumber,
        messageId: `bot_${Date.now()}`,
        content: cleanResponse,
        messageType: 'bot',
        timestamp: new Date().toISOString(),
        aiProvider: this.aiService.getConfig().provider
      });

      return { response: cleanResponse, shouldContinue: true };

    } catch (error) {
      logger.error('Erreur lors du traitement du message', {
        error: error instanceof Error ? error.message : 'Unknown error',
        phoneNumber,
        messageId
      });

      return {
        response: "Désolé, je rencontre une difficulté technique. SubhanAllah, veuillez réessayer dans quelques instants ou contacter notre service client au +237 691 100 575.",
        shouldContinue: true
      };
    }
  }

  /**
   * Gérer un workflow actif - continuer l'exécution
   */
  private async handleWorkflowStep(
    user: User,
    workflowContext: WorkflowContext,
    userMessage: string,
    messageId: string
  ): Promise<string> {
    try {
      logger.info('Continuation du workflow actif', {
        userId: user.id,
        workflowId: workflowContext.workflowId,
        currentState: workflowContext.currentState
      });

      // Exécuter l'étape suivante du workflow
      let stepResult: WorkflowStepResult = await this.simulateTypingWhileProcessing(
        user.phoneNumber,
        async () => await this.workflowEngine.executeStep(user.id!, workflowContext, userMessage),
        2000,
        messageId
      );

      if (!stepResult.success) {
        // Erreur dans le workflow
        logger.error('Erreur lors de l\'exécution du workflow', {
          userId: user.id,
          workflowId: workflowContext.workflowId,
          error: stepResult.error
        });

        // Retourner le message d'erreur du workflow (avec instructions)
        return stepResult.message || stepResult.error || 'Une erreur est survenue.';
      }

      // Si le message est vide et que le workflow n'est pas terminé, continuer automatiquement
      // Cela permet d'exécuter les états de traitement (processing) sans interaction utilisateur
      // Ne pas continuer si l'état demande à rester en place (stayInCurrentState)
      let maxAutoSteps = 5; // Limite pour éviter les boucles infinies
      while (!stepResult.message && !stepResult.completed && !stepResult.stayInCurrentState && maxAutoSteps > 0) {
        logger.info('Exécution automatique de l\'étape suivante (pas de message)', {
          userId: user.id,
          workflowId: workflowContext.workflowId,
          currentState: workflowContext.currentState
        });

        // Recharger le contexte mis à jour
        const updatedContext = await this.workflowEngine.getActiveWorkflow(user.id!);
        if (!updatedContext) {
          break;
        }

        // Exécuter l'étape suivante avec un message vide (étape automatique)
        stepResult = await this.workflowEngine.executeStep(user.id!, updatedContext, '');
        maxAutoSteps--;

        if (!stepResult.success) {
          logger.error('Erreur lors de l\'exécution automatique du workflow', {
            userId: user.id,
            workflowId: workflowContext.workflowId,
            error: stepResult.error
          });
          return stepResult.message || stepResult.error || 'Une erreur est survenue.';
        }
      }

      // Vérifier si le workflow est terminé
      if (stepResult.completed) {
        logger.info('Workflow terminé avec succès', {
          userId: user.id,
          workflowId: workflowContext.workflowId
        });

        // Si c'est le workflow de collecte de nom, mettre à jour le nom de l'utilisateur
        // Récupérer le nom depuis le dernier contexte chargé dans la boucle while
        if (workflowContext.workflowId === 'name_collection') {
          // Recharger le contexte depuis la base pour avoir toutes les données
          // même si le workflow est marqué completed
          const savedContext = await this.databaseService.getWorkflowContextById(user.id!, 'name_collection');

          if (savedContext && savedContext.data.user_name) {
            logger.info('Sauvegarde du nom de l\'utilisateur', {
              userId: user.id,
              userName: savedContext.data.user_name
            });

            await this.databaseService.updateUserState(
              user.id!,
              'active',
              savedContext.data.user_name
            );

            logger.info('Nom de l\'utilisateur sauvegardé avec succès', {
              userId: user.id,
              userName: savedContext.data.user_name
            });
          } else {
            logger.warn('Impossible de récupérer le nom depuis le contexte du workflow', {
              userId: user.id,
              hasContext: !!savedContext,
              hasUserName: savedContext?.data.user_name
            });
          }
        }
      }

      return stepResult.message;

    } catch (error) {
      logger.error('Erreur lors du traitement du workflow', {
        error,
        userId: user.id,
        workflowId: workflowContext.workflowId
      });

      // Annuler le workflow en cas d'erreur
      await this.workflowEngine.cancelWorkflow(user.id!, 'error');

      return "Une erreur est survenue. Votre demande a été annulée. Comment puis-je vous aider ?";
    }
  }

  /**
   * Gérer l'absence de workflow actif - démarrer un nouveau workflow ou répondre directement
   */
  private async handleNoActiveWorkflow(
    user: User,
    userMessage: string,
    messageId: string
  ): Promise<string> {
    try {
      // PRIORITÉ 1: Si l'utilisateur n'a pas de nom, démarrer le workflow de collecte de nom
      if (!user.name) {
        logger.info('Utilisateur sans nom détecté - démarrage du workflow name_collection', {
          userId: user.id,
          phoneNumber: user.phoneNumber
        });

        return await this.startNameCollectionWorkflow(user, userMessage, messageId);
      }

      // PRIORITÉ 2: Classifier l'intention du message
      const intentResult = await this.intentClassifier.classifyIntent(userMessage);

      logger.info('Intention classifiée', {
        userId: user.id,
        intent: intentResult.primaryIntent.name,
        confidence: intentResult.confidence,
        workflowId: intentResult.primaryIntent.workflowId
      });

      // PRIORITÉ 3: Si une intention avec workflow est détectée
      if (intentResult.primaryIntent.workflowId && intentResult.confidence >= 0.6) {
        logger.info('Démarrage du workflow basé sur l\'intention', {
          userId: user.id,
          intent: intentResult.primaryIntent.name,
          workflowId: intentResult.primaryIntent.workflowId
        });

        return await this.startWorkflowFromIntent(user, intentResult.primaryIntent.workflowId, userMessage, messageId);
      }

      // PRIORITÉ 4: Pas de workflow détecté, répondre avec l'IA
      logger.info('Aucun workflow détecté - réponse IA générative', {
        userId: user.id,
        intent: intentResult.primaryIntent.name
      });

      return await this.handleAIConversation(user, userMessage, intentResult.primaryIntent.name, messageId);

    } catch (error) {
      logger.error('Erreur lors du traitement sans workflow actif', {
        error,
        userId: user.id
      });

      return this.generateFallbackResponse(userMessage, user.name);
    }
  }

  /**
   * Démarrer le workflow de collecte de nom
   */
  private async startNameCollectionWorkflow(
    user: User,
    userMessage: string,
    messageId: string
  ): Promise<string> {
    try {
      // Démarrer le workflow name_collection
      const context = await this.simulateTypingWhileProcessing(
        user.phoneNumber,
        async () => await this.workflowEngine.startWorkflow(user.id!, 'name_collection'),
        1800,
        messageId
      );

      // Exécuter la première étape (afficher le message de bienvenue)
      const stepResult = await this.workflowEngine.executeStep(user.id!, context, userMessage);

      return stepResult.message;

    } catch (error) {
      logger.error('Erreur lors du démarrage du workflow name_collection', {
        error,
        userId: user.id
      });

      // Fallback en cas d'erreur - message statique
      return `Salam 👋 Je suis *ISSA*, votre compagnon digital chez *ROI Takaful* 🌙

Je suis là pour vous écouter, vous guider et répondre à vos questions sur nos produits d'assurance conformes à la Charia.

Avant de commencer, comment puis-je vous appeler ? ✍️
(J'aime bien savoir avec qui je discute, ça rend la conversation plus conviviale 😉)`;
    }
  }

  /**
   * Démarrer un workflow basé sur l'intention détectée
   */
  private async startWorkflowFromIntent(
    user: User,
    workflowId: string,
    userMessage: string,
    messageId: string
  ): Promise<string> {
    try {
      // Démarrer le workflow
      const context = await this.simulateTypingWhileProcessing(
        user.phoneNumber,
        async () => await this.workflowEngine.startWorkflow(user.id!, workflowId),
        2000,
        messageId
      );

      // Exécuter la première étape
      const stepResult = await this.workflowEngine.executeStep(user.id!, context, userMessage);

      return stepResult.message;

    } catch (error) {
      logger.error('Erreur lors du démarrage du workflow depuis intention', {
        error,
        userId: user.id,
        workflowId
      });

      // Fallback - répondre avec l'IA
      return await this.handleAIConversation(user, userMessage, 'fallback', messageId);
    }
  }

  /**
   * Gérer une conversation avec l'IA (pas de workflow)
   */
  private async handleAIConversation(
    user: User,
    userMessage: string,
    intentName: string,
    messageId: string
  ): Promise<string> {
    try {
      // Estimer la durée de traitement basée sur la longueur du message
      const estimatedDuration = Math.min(Math.max(userMessage.length * 50, 2000), 8000);

      // Simuler l'écriture pendant le traitement IA
      const aiResponse: AIResponse = await this.simulateTypingWhileProcessing(
        user.phoneNumber,
        async () => {
          // Obtenir l'historique de conversation
          const conversationHistory = await this.databaseService.getConversationHistory(user.id!);

          // Rechercher dans la base de connaissances avec recherche améliorée
          const searchResults = await this.knowledgeService.searchByIntent(
            userMessage,
            { name: intentName, confidence: 1 },
            5
          );

          logger.info('Knowledge search results', {
            query: userMessage.substring(0, 50),
            totalFound: searchResults.totalFound,
            entriesCount: searchResults.entries.length,
            topScores: searchResults.entries.slice(0, 3).map(e => e.relevanceScore),
            topTitles: searchResults.entries.slice(0, 3).map(e => e.title)
          });

          // Construire le contexte à partir des résultats (formaté avec formatContextForAI)
          const formattedContext = await this.knowledgeService.formatContextForAI(searchResults, 3);
          const knowledgeContext = formattedContext.formattedContext;

          logger.info('Knowledge context for AI', {
            contextLength: knowledgeContext.length,
            relevantEntries: formattedContext.relevantEntries.length,
            contextPreview: knowledgeContext.substring(0, 300)
          });

          // Créer le prompt système avec contexte
          const systemPrompt = this.aiService.createSystemPrompt(user.name, knowledgeContext);

          logger.info('System prompt created', {
            promptLength: systemPrompt.length,
            hasKnowledgeContext: systemPrompt.includes('CONNAISSANCES DISPONIBLES'),
            contextInPrompt: systemPrompt.includes(searchResults.entries[0]?.title || 'N/A')
          });

          // Générer la réponse avec l'IA
          return await this.aiService.generateResponse(
            userMessage,
            conversationHistory,
            systemPrompt
          );
        },
        estimatedDuration,
        messageId
      );

      if (!aiResponse.success || !aiResponse.content) {
        logger.warn('Échec de la génération IA, utilisation de la réponse de fallback', {
          error: aiResponse.error,
          userId: user.id
        });

        return this.generateFallbackResponse(userMessage, user.name);
      }

      // Mettre à jour l'état utilisateur comme actif
      await this.databaseService.updateUserState(user.id!, 'active');

      return aiResponse.content;

    } catch (error) {
      logger.error('Erreur lors de la conversation active', { error, userId: user.id });
      return this.generateFallbackResponse(userMessage, user.name);
    }
  }

  /**
   * Générer une réponse de fallback quand l'IA échoue
   */
  private generateFallbackResponse(userMessage: string, userName?: string): string {
    const greeting = userName ? `${userName}, ` : '';

    return `${greeting}je vous remercie pour votre message. Pour une réponse précise et détaillée, n'hésitez pas à :

🌐 Consulter notre site : www.royalonyx.cm
📞 Contacter notre service client : +237 691 100 575
📧 Nous écrire : contact@royalonyx.cm

Je reste à votre disposition pour toute autre question !`;
  }

  /**
   * Obtenir le contexte de conversation pour un utilisateur
   */
  async getConversationContext(phoneNumber: string): Promise<ConversationContext | null> {
    try {
      const user = await this.databaseService.getOrCreateUser(phoneNumber);
      const conversationHistory = await this.databaseService.getConversationHistory(user.id!);

      return {
        userId: user.id!,
        phoneNumber: user.phoneNumber,
        userName: user.name,
        conversationHistory,
        lastInteraction: user.lastInteraction || new Date().toISOString(),
        state: user.conversationState
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération du contexte', { error, phoneNumber });
      return null;
    }
  }

  /**
   * Nettoyer le formatage Markdown pour WhatsApp
   */
  private cleanMarkdownForWhatsApp(text: string): string {
    return text
      // Supprimer les en-têtes Markdown (###, ##, #)
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^### (.+)$/gm, '📋 $1')
      .replace(/^## (.+)$/gm, '📌 $1')
      .replace(/^# (.+)$/gm, '🎯 $1')
      // Gérer les gras WhatsApp (conserver *)
      .replace(/\*\*([^*]+)\*\*/g, '*$1*')
      // Supprimer les italiques Markdown
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Gérer les flèches et symboles spéciaux
      .replace(/^→\s*/gm, '▶️ ')
      .replace(/→/g, '▶️')
      // Supprimer les séparateurs markdown
      .replace(/^-{3,}$/gm, '')
      .replace(/^---$/gm, '')
      // Nettoyer les listes avec tirets
      .replace(/^- /gm, '🔹 ')
      .replace(/^\+ /gm, '✅ ')
      // Nettoyer les listes numérotées
      .replace(/^\d+\.\s*/gm, '📍 ')
      // Supprimer les espaces multiples et lignes vides excessives
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/\s+$/gm, '') // Supprimer les espaces en fin de ligne
      .trim();
  }

  /**
   * Simuler l'indicateur "En train d'écrire" pendant le traitement
   */
  private async simulateTypingWhileProcessing<T>(
    phoneNumber: string,
    processingFunction: () => Promise<T>,
    estimatedDuration: number = 3000,
    messageId?: string
  ): Promise<T> {
    // Démarrer l'indicateur "En train d'écrire"
    const { container, TOKENS } = await import('../core');
    const whatsappService = await container.resolve(TOKENS.WHATSAPP_SERVICE) as {
      sendTypingIndicator(to: string, messageId?: string): Promise<boolean>;
    };

    // Démarrer l'indicateur de frappe avec le messageId si disponible
    await whatsappService.sendTypingIndicator(phoneNumber, messageId);

    try {
      // Calculer un délai minimum réaliste basé sur la longueur du message
      const minDelay = Math.max(1500, Math.min(estimatedDuration * 0.3, 2500));

      // Exécuter le traitement et le délai en parallèle
      const [result] = await Promise.all([
        processingFunction(),
        this.simulateRealisticTypingDelay(minDelay, estimatedDuration)
      ]);

      return result;
    } finally {
      // L'indicateur de frappe se désactive automatiquement après 25 secondes ou quand on envoie un message
      // Pas besoin d'appel explicite pour l'arrêter
    }
  }

  /**
   * Simuler un délai de frappe réaliste avec variations
   */
  private async simulateRealisticTypingDelay(minDelay: number, maxDelay: number): Promise<void> {
    // Ajouter une variation naturelle de +/- 20%
    const variation = 0.2;
    const randomFactor = 1 + (Math.random() - 0.5) * variation;
    const delay = Math.max(minDelay, Math.min(maxDelay * randomFactor, maxDelay));

    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Réinitialiser une conversation
   */
  async resetConversation(phoneNumber: string): Promise<void> {
    try {
      const user = await this.databaseService.getOrCreateUser(phoneNumber);

      // Annuler tout workflow actif
      const activeWorkflow = await this.workflowEngine.getActiveWorkflow(user.id!);
      if (activeWorkflow) {
        await this.workflowEngine.cancelWorkflow(user.id!, 'reset');
      }

      // Réinitialiser l'état utilisateur
      await this.databaseService.updateUserState(user.id!, 'greeting');

      logger.info('Conversation réinitialisée', { phoneNumber, userId: user.id });
    } catch (error) {
      logger.error('Erreur lors de la réinitialisation', { error, phoneNumber });
      throw error;
    }
  }
}
