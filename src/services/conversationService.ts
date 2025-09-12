import { User, ConversationContext, AIResponse } from '../types';
import { DatabaseService } from './databaseService';
import { AIService } from './aiService';
import { KnowledgeService } from './knowledgeService';
import { logger } from '../utils/logger';

export class ConversationService {
  private databaseService: DatabaseService;
  private aiService: AIService;
  private knowledgeService: KnowledgeService;

  constructor(
    databaseService: DatabaseService,
    aiService: AIService,
    knowledgeService: KnowledgeService
  ) {
    this.databaseService = databaseService;
    this.aiService = aiService;
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

      // Traiter selon l'état de la conversation
      let response: string;
      const shouldContinue = true;

      switch (user.conversationState) {
        case 'greeting':
          response = await this.handleGreeting(user, userMessage);
          break;
        case 'name_collection':
          response = await this.handleNameCollection(user, userMessage);
          break;
        case 'active':
        case 'idle':
          response = await this.handleActiveConversation(user, userMessage);
          break;
        default:
          response = await this.handleActiveConversation(user, userMessage);
      }

      // Sauvegarder la réponse du bot
      await this.databaseService.saveConversationMessage({
        userId: user.id!,
        phoneNumber,
        messageId: `bot_${Date.now()}`,
        content: response,
        messageType: 'bot',
        timestamp: new Date().toISOString(),
        aiProvider: this.aiService.getConfig().provider
      });

      return { response, shouldContinue };

    } catch (error) {
      logger.error('Erreur lors du traitement du message', {
        error: error instanceof Error ? error.message : 'Unknown error',
        phoneNumber,
        messageId
      });

      return {
        response: "Désolé, je rencontre une difficulté technique. Veuillez réessayer dans quelques instants ou contacter notre service client au +237 691 100 575.",
        shouldContinue: true
      };
    }
  }

  /**
   * Gérer la première interaction (salutation)
   */
  private async handleGreeting(user: User, userMessage: string): Promise<string> {
    try {
      // Si l'utilisateur a déjà un nom enregistré, passer directement à l'état actif
      if (user.name) {
        await this.databaseService.updateUserState(user.id!, 'active');
        return await this.handleActiveConversation(user, userMessage);
      }

      // Vérifier si l'utilisateur donne son nom dans le premier message
      const nameMatch = this.extractNameFromMessage(userMessage);
      if (nameMatch) {
        await this.databaseService.updateUserState(user.id!, 'active', nameMatch);
        const greeting = this.aiService.createGreetingMessage(nameMatch);
        return `${greeting}\n\nComment puis-je vous aider aujourd'hui ?`;
      }

      // Sinon, demander le nom
      await this.databaseService.updateUserState(user.id!, 'name_collection');
      const greeting = this.aiService.createGreetingMessage();
      const nameRequest = this.aiService.createNameRequestMessage();
      
      return `${greeting}\n\n${nameRequest}`;

    } catch (error) {
      logger.error('Erreur lors de la gestion de la salutation', { error, userId: user.id });
      throw error;
    }
  }

  /**
   * Gérer la collecte du nom
   */
  private async handleNameCollection(user: User, userMessage: string): Promise<string> {
    try {
      const name = this.extractNameFromMessage(userMessage) || userMessage.trim();
      
      // Valider le nom (ne pas accepter les réponses trop courtes ou inappropriées)
      if (name.length < 2 || name.length > 50 || this.isInvalidName(name)) {
        return "Je n'ai pas bien compris votre nom. Pouvez-vous me dire comment vous vous appelez ?";
      }

      // Sauvegarder le nom et passer à l'état actif
      await this.databaseService.updateUserState(user.id!, 'active', name);
      
      const welcomeMessage = `Ravi de faire votre connaissance, ${name} ! 😊\n\nJe suis ISSA, votre assistant virtuel Royal Onyx Insurance. Je suis là pour vous renseigner sur nos produits d'assurance classiques et notre fenêtre ROI Takaful conforme à la Charia.\n\nComment puis-je vous aider aujourd'hui ?`;
      
      return welcomeMessage;

    } catch (error) {
      logger.error('Erreur lors de la collecte du nom', { error, userId: user.id });
      throw error;
    }
  }

  /**
   * Gérer la conversation active avec l'IA
   */
  private async handleActiveConversation(user: User, userMessage: string): Promise<string> {
    try {
      // Obtenir l'historique de conversation
      const conversationHistory = await this.databaseService.getConversationHistory(user.id!);
      
      // Rechercher dans la base de connaissances
      const knowledgeContext = await this.knowledgeService.getContextForQuery(userMessage);
      
      // Créer le prompt système avec contexte
      const systemPrompt = this.aiService.createSystemPrompt(user.name, knowledgeContext);
      
      // Générer la réponse avec l'IA
      const aiResponse: AIResponse = await this.aiService.generateResponse(
        userMessage,
        conversationHistory,
        systemPrompt
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
   * Extraire un nom potentiel d'un message
   */
  private extractNameFromMessage(message: string): string | null {
    const cleanMessage = message.trim();
    
    // Patterns pour détecter un nom
    const namePatterns = [
      /(?:je m'appelle|mon nom est|je suis|c'est)\s+([a-zA-ZÀ-ÿ\s]{2,30})/i,
      /^([A-ZÀ-Ÿ][a-zA-ZÀ-ÿ]{1,29})$/,
      /^([A-ZÀ-Ÿ][a-zA-ZÀ-ÿ]+\s+[A-ZÀ-Ÿ][a-zA-ZÀ-ÿ]+)$/
    ];

    for (const pattern of namePatterns) {
      const match = cleanMessage.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Si le message est court et semble être juste un nom
    if (cleanMessage.length >= 2 && cleanMessage.length <= 30 && 
        /^[a-zA-ZÀ-ÿ\s]+$/.test(cleanMessage) && 
        !this.isInvalidName(cleanMessage)) {
      return cleanMessage;
    }

    return null;
  }

  /**
   * Vérifier si un nom est invalide
   */
  private isInvalidName(name: string): boolean {
    const invalidPatterns = [
      /^\d+$/, // Que des chiffres
      /^[!@#$%^&*()]+$/, // Que des symboles
      /(bonjour|salut|hello|hi|oui|non|merci)/i, // Mots courants qui ne sont pas des noms
      /^.{1}$/, // Un seul caractère
      /^\s+$/ // Que des espaces
    ];

    return invalidPatterns.some(pattern => pattern.test(name));
  }

  /**
   * Générer une réponse de fallback quand l'IA échoue
   */
  private generateFallbackResponse(userMessage: string, userName?: string): string {
    const greeting = userName ? `${userName}, ` : '';
    
    // Détecter le type de requête
    if (this.knowledgeService.isTakafulQuery(userMessage)) {
      return `${greeting}pour les questions concernant nos produits Takaful conformes à la Charia, je vous invite à consulter notre site spécialisé :\n\n🕌 **ROI Takaful :** www.roitakaful.com\n📞 **Service client :** +237 691 100 575\n\nNotre équipe vous accompagnera avec plaisir !`;
    }

    const keywords = this.knowledgeService.identifyRelevantKeywords(userMessage);
    if (keywords.length > 0) {
      return this.aiService.createWebsiteRedirection(`votre question sur ${keywords.join(', ')}`);
    }

    return `${greeting}je vous remercie pour votre message. Pour une réponse précise et détaillée, n'hésitez pas à :\n\n🌐 Consulter notre site : www.royalonyx.cm\n📞 Contacter notre service client : +237 691 100 575\n📧 Nous écrire : contact@royalonyx.cm\n\nJe reste à votre disposition pour toute autre question !`;
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
   * Réinitialiser une conversation
   */
  async resetConversation(phoneNumber: string): Promise<void> {
    try {
      const user = await this.databaseService.getOrCreateUser(phoneNumber);
      await this.databaseService.updateUserState(user.id!, 'greeting');
      logger.info('Conversation réinitialisée', { phoneNumber, userId: user.id });
    } catch (error) {
      logger.error('Erreur lors de la réinitialisation', { error, phoneNumber });
      throw error;
    }
  }
}