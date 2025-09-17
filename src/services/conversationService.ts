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
      let user = await this.databaseService.getOrCreateUser(phoneNumber);

      // Si l'utilisateur n'a pas de nom mais n'est pas dans l'état greeting, le remettre en greeting
      if (!user.name && user.conversationState !== 'greeting' && user.conversationState !== 'name_collection') {
        await this.databaseService.updateUserState(user.id!, 'greeting');
        user = { ...user, conversationState: 'greeting' };
        logger.info('Utilisateur sans nom remis en état greeting', { userId: user.id, phoneNumber });
      }

      // Détecter les mots de salutation pour réinitialiser une conversation même si l'utilisateur a un nom
      if (this.isGreetingMessage(userMessage) && user.conversationState !== 'greeting' && user.conversationState !== 'name_collection') {
        await this.databaseService.updateUserState(user.id!, 'greeting');
        user = { ...user, conversationState: 'greeting' };
        // Marquer que c'est une réinitialisation par salutation
        (user as any).isGreetingReset = true;
        logger.info('Conversation réinitialisée suite à message de salutation', { userId: user.id, phoneNumber });
      }

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
          response = await this.handleGreeting(user, userMessage, messageId);
          break;
        case 'name_collection':
          response = await this.handleNameCollection(user, userMessage, messageId);
          break;
        case 'active':
        case 'idle':
          response = await this.handleActiveConversation(user, userMessage, messageId);
          break;
        default:
          response = await this.handleActiveConversation(user, userMessage, messageId);
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

      return { response: cleanResponse, shouldContinue };

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
  private async handleGreeting(user: User, userMessage: string, messageId: string): Promise<string> {
    try {
      // Vérifier si l'utilisateur donne son nom dans le premier message
      const nameMatch = this.extractNameFromMessage(userMessage);
      if (nameMatch) {
        return await this.simulateTypingWhileProcessing(
          user.phoneNumber,
          async () => {
            await this.databaseService.updateUserState(user.id!, 'active', nameMatch);
            const greeting = this.aiService.createGreetingMessage(nameMatch);
            return `${greeting}\n\nComment puis-je vous aider aujourd'hui ?`;
          },
          2000,
          messageId
        );
      }

      // Si c'est une réinitialisation par salutation, toujours demander le nom
      // même si l'utilisateur en a déjà un (pour humaniser l'échange)
      if ((user as any).isGreetingReset) {
        // Message statique - AUCUNE IA utilisée ici - TOUJOURS demander le nom en cas de réinitialisation
        const staticGreetingMessage = `Salam 👋 Je suis ISSA, votre compagnon digital chez ROI Takaful 🌙.

Je suis là pour vous écouter, vous guider et répondre à vos questions.

Avant de commencer, comment puis-je vous appeler ? ✍️
(J'aime bien savoir avec qui je discute, ça rend la conversation plus conviviale 😉)`;

        return await this.simulateTypingWhileProcessing(
          user.phoneNumber,
          async () => {
            await this.databaseService.updateUserState(user.id!, 'name_collection');
            // Retourner directement le message statique
            return staticGreetingMessage;
          },
          1800, // Durée plus courte pour les messages de bienvenue
          messageId
        );
      }

      // Si l'utilisateur n'a pas de nom (nouveau utilisateur)
      if (!user.name) {
        const staticGreetingMessage = `Salam 👋 Je suis ISSA, votre compagnon digital chez ROI Takaful 🌙.

Je suis là pour vous écouter, vous guider et répondre à vos questions.

Avant de commencer, comment puis-je vous appeler ? ✍️
(J'aime bien savoir avec qui je discute, ça rend la conversation plus conviviale 😉)`;

        return await this.simulateTypingWhileProcessing(
          user.phoneNumber,
          async () => {
            await this.databaseService.updateUserState(user.id!, 'name_collection');
            return staticGreetingMessage;
          },
          1800,
          messageId
        );
      }

      // Si l'utilisateur a déjà un nom et ce n'est pas une réinitialisation,
      // on utilise le message de salutation personnalisé
      return await this.simulateTypingWhileProcessing(
        user.phoneNumber,
        async () => {
          await this.databaseService.updateUserState(user.id!, 'active');
          // Utiliser le message de salutation personnalisé pour utilisateur connu
          return this.aiService.createGreetingMessage(user.name);
        },
        1800,
        messageId
      );

    } catch (error) {
      logger.error('Erreur lors de la gestion de la salutation', { error, userId: user.id });
      throw error;
    }
  }

  /**
   * Gérer la collecte du nom
   */
  private async handleNameCollection(user: User, userMessage: string, messageId: string): Promise<string> {
    try {
      const name = this.extractNameFromMessage(userMessage) || userMessage.trim();
      
      // Valider le nom (ne pas accepter les réponses trop courtes ou inappropriées)
      if (name.length < 2 || name.length > 50 || this.isInvalidName(name)) {
        return "Je n'ai pas bien compris votre nom. Pouvez-vous me dire comment vous vous appelez ?";
      }

      // Simuler l'écriture pendant la préparation du message de bienvenue
      return await this.simulateTypingWhileProcessing(
        user.phoneNumber,
        async () => {
          // Sauvegarder le nom et passer à l'état actif
          await this.databaseService.updateUserState(user.id!, 'active', name);

          // Premier message de bienvenue personnalisé
          const welcomeMessage = this.aiService.createWelcomeAfterNameMessage(name);

          // Programmer l'envoi du message de suivi de manière asynchrone
          this.scheduleFollowUpMessage(user, name);

          return welcomeMessage;
        },
        2500,
        messageId
      );

    } catch (error) {
      logger.error('Erreur lors de la collecte du nom', { error, userId: user.id });
      throw error;
    }
  }

  /**
   * Gérer la conversation active avec l'IA
   */
  private async handleActiveConversation(user: User, userMessage: string, messageId: string): Promise<string> {
    try {
      // Estimer la durée de traitement basée sur la longueur du message
      const estimatedDuration = Math.min(Math.max(userMessage.length * 50, 2000), 8000);
      
      // Simuler l'écriture pendant le traitement IA
      const aiResponse: AIResponse = await this.simulateTypingWhileProcessing(
        user.phoneNumber,
        async () => {
          // Obtenir l'historique de conversation
          const conversationHistory = await this.databaseService.getConversationHistory(user.id!);

          // Rechercher dans la base de connaissances
          const knowledgeContext = await this.knowledgeService.getContextForQuery(userMessage);

          // Créer le prompt système avec contexte
          const systemPrompt = this.aiService.createSystemPrompt(user.name, knowledgeContext);

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
   * Vérifier si un message est un message de salutation
   */
  private isGreetingMessage(message: string): boolean {
    const greetingPatterns = [
      /^(salut|bonjour|bonsoir|hello|hi|salam|assalam|peace)\s*$/i,
      /^(salut|bonjour|bonsoir|hello|hi|salam)\s*[!.]*\s*$/i,
      /^(assalam\s*alaykum|assalamou\s*alaykoum|salam\s*alaykoum)\s*[!.]*\s*$/i
    ];

    const cleanMessage = message.trim();
    return greetingPatterns.some(pattern => pattern.test(cleanMessage));
  }

  /**
   * Générer une réponse de fallback quand l'IA échoue
   */
  private generateFallbackResponse(userMessage: string, userName?: string): string {
    const greeting = userName ? `${userName}, ` : '';
    
    // Détecter le type de requête
    if (this.knowledgeService.isTakafulQuery(userMessage)) {
      return `${greeting}pour les questions concernant nos produits Takaful conformes à la Charia, je vous invite à consulter notre site spécialisé :\n\n🕌 ROI Takaful : www.roitakaful.com\n📞 Service client : +237 691 100 575\n\nNotre équipe vous accompagnera avec plaisir !`;
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
   * Nettoyer le formatage Markdown pour WhatsApp
   */
  private cleanMarkdownForWhatsApp(text: string): string {
    return text
      // Supprimer les en-têtes Markdown (###, ##, #)
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^### (.+)$/gm, '📋 $1')
      .replace(/^## (.+)$/gm, '📌 $1')
      .replace(/^# (.+)$/gm, '🎯 $1')
      // Supprimer les gras et italiques Markdown
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Gérer les flèches et symboles spéciaux de l'image
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
      // Gérer les caractères spéciaux problématiques
      .replace(/\*Ce dont nous avons parlé\*/g, '💬 Ce dont nous avons parlé')
      .replace(/\*([^*]+)\*/g, '$1')
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
    // Note: nous devons importer le whatsappService mais pour éviter la dépendance circulaire,
    // nous le récupérerons via le container
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
   * Programmer l'envoi du message de suivi après collecte du nom
   */
  private scheduleFollowUpMessage(user: User, userName: string): void {
    // Programmer l'envoi du message de suivi après un délai
    setTimeout(async () => {
      try {
        // Attendre un délai naturel puis envoyer l'indicateur de frappe
        const { container, TOKENS } = await import('../core');
        const whatsappService = await container.resolve(TOKENS.WHATSAPP_SERVICE) as {
          sendMessage(to: string, message: string): Promise<boolean>;
          sendTypingIndicator(to: string): Promise<boolean>;
        };

        // Simuler l'écriture du message de suivi
        await whatsappService.sendTypingIndicator(user.phoneNumber);

        // Attendre un peu pour simuler l'écriture
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Envoyer le message de suivi
        const followUpMessage = this.aiService.createFollowUpMessage(userName);
        const cleanMessage = this.cleanMarkdownForWhatsApp(followUpMessage);

        await this.databaseService.saveConversationMessage({
          userId: user.id!,
          phoneNumber: user.phoneNumber,
          messageId: `followup_${Date.now()}`,
          content: cleanMessage,
          messageType: 'bot',
          timestamp: new Date().toISOString(),
          aiProvider: this.aiService.getConfig().provider
        });

        await whatsappService.sendMessage(user.phoneNumber, cleanMessage);

        logger.debug('Message de suivi envoyé', {
          phoneNumber: user.phoneNumber,
          userName
        });
      } catch (error) {
        logger.error('Erreur lors de l\'envoi du message de suivi', {
          error,
          phoneNumber: user.phoneNumber,
          userName
        });
      }
    }, 2000); // Délai de 2 secondes après le premier message
  }

  /**
   * Envoyer un message du bot et le sauvegarder en base
   */
  private async sendBotMessage(user: User, message: string, messageId: string): Promise<void> {
    try {
      // Nettoyer le formatage Markdown avant l'envoi
      const cleanMessage = this.cleanMarkdownForWhatsApp(message);

      // Sauvegarder le message en base de données
      await this.databaseService.saveConversationMessage({
        userId: user.id!,
        phoneNumber: user.phoneNumber,
        messageId,
        content: cleanMessage,
        messageType: 'bot',
        timestamp: new Date().toISOString(),
        aiProvider: this.aiService.getConfig().provider
      });

      // Envoyer le message via WhatsApp
      const { container, TOKENS } = await import('../core');
      const whatsappService = await container.resolve(TOKENS.WHATSAPP_SERVICE) as {
        sendMessage(to: string, message: string): Promise<boolean>;
      };

      await whatsappService.sendMessage(user.phoneNumber, cleanMessage);

      logger.debug('Message bot envoyé', {
        phoneNumber: user.phoneNumber,
        messageId,
        messageLength: cleanMessage.length
      });
    } catch (error) {
      logger.error('Erreur lors de l\'envoi du message bot', {
        error,
        phoneNumber: user.phoneNumber,
        messageId
      });
      throw error;
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