import { AIResponse, AIProviderConfig, OpenAIRequest, OpenAIResponse, DeepSeekRequest, DeepSeekResponse, ConversationMessage } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';
import { IHttpClient } from '../core/interfaces/IHttpClient';

export class AIService {
  private httpClient: IHttpClient;
  private aiConfig: AIProviderConfig;

  constructor(httpClient: IHttpClient) {
    this.httpClient = httpClient;
    this.aiConfig = {
      provider: config.ai.provider,
      apiKey: config.ai.apiKey,
      model: config.ai.model,
      baseUrl: config.ai.baseUrl
    };

    logger.info('AI Service initialized', {
      provider: this.aiConfig.provider,
      model: this.aiConfig.model,
      hasApiKey: !!this.aiConfig.apiKey
    });
  }

  private getDefaultModel(): string {
    return config.ai.provider === 'openai' ? 'gpt-3.5-turbo' : 'deepseek-chat';
  }

  /**
   * Générer une réponse avec l'IA configurée
   */
  async generateResponse(
    userMessage: string,
    conversationHistory: ConversationMessage[] = [],
    systemPrompt?: string
  ): Promise<AIResponse> {
    try {
      if (!this.aiConfig.apiKey) {
        throw new Error(`Clé API manquante pour ${this.aiConfig.provider}`);
      }

      // Construire les messages pour l'IA
      const messages = this.buildMessages(userMessage, conversationHistory, systemPrompt);

      if (this.aiConfig.provider === 'openai') {
        return await this.callOpenAI(messages);
      } else {
        return await this.callDeepSeek(messages);
      }

    } catch (error) {
      logger.error('Erreur lors de la génération de réponse IA', {
        provider: this.aiConfig.provider,
        error: error instanceof Error ? error.message : 'Unknown error',
        userMessage: userMessage.substring(0, 100)
      });

      return {
        success: false,
        error: `Erreur ${this.aiConfig.provider}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider: this.aiConfig.provider
      };
    }
  }

  /**
   * Construire les messages pour l'IA
   */
  private buildMessages(
    userMessage: string,
    conversationHistory: ConversationMessage[],
    systemPrompt?: string
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // Message système
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // Historique de conversation (limité aux 10 derniers échanges pour éviter de surcharger)
    const recentHistory = conversationHistory.slice(-20);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.messageType === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    }

    // Message actuel de l'utilisateur
    messages.push({
      role: 'user',
      content: userMessage
    });

    return messages;
  }

  /**
   * Appeler l'API OpenAI
   */
  private async callOpenAI(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): Promise<AIResponse> {
    try {
      const requestData: OpenAIRequest = {
        model: this.aiConfig.model,
        messages,
        temperature: 0.7,
        max_tokens: 1000
      };

      // Note: baseURL and headers are configured at the HTTP client level
      const response = await this.httpClient.post('/chat/completions', requestData);

      const data = response.data as OpenAIResponse;

      if (data.choices && data.choices.length > 0) {
        return {
          success: true,
          content: data.choices[0].message.content,
          provider: 'openai',
          tokensUsed: data.usage?.total_tokens
        };
      } else {
        throw new Error('Aucune réponse reçue d\'OpenAI');
      }

    } catch (error: unknown) {
      logger.error('Erreur API OpenAI', { error });
      throw error;
    }
  }

  /**
   * Appeler l'API DeepSeek
   */
  private async callDeepSeek(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): Promise<AIResponse> {
    try {
      const requestData: DeepSeekRequest = {
        model: this.aiConfig.model,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: false
      };

      // Note: baseURL and headers are configured at the HTTP client level
      const response = await this.httpClient.post('/chat/completions', requestData);

      const data = response.data as DeepSeekResponse;

      if (data.choices && data.choices.length > 0) {
        return {
          success: true,
          content: data.choices[0].message.content,
          provider: 'deepseek',
          tokensUsed: data.usage?.total_tokens
        };
      } else {
        throw new Error('Aucune réponse reçue de DeepSeek');
      }

    } catch (error: unknown) {
      logger.error('Erreur API DeepSeek', { error });
      throw error;
    }
  }

  /**
   * Créer un prompt système pour ISSA
   */
  createSystemPrompt(userName?: string, knowledgeContext?: string): string {
    const basePrompt = `Tu es ISSA, l'assistant virtuel de Royal Onyx Insurance (ROI) et de sa fenêtre Takaful.

INFORMATIONS SUR TOI :
- Tu es un assistant bienveillant, professionnel et chaleureux
- Tu représentes Royal Onyx Insurance, une compagnie d'assurance camerounaise agréée CIMA
- Tu maîtrises aussi ROI Takaful, la fenêtre d'assurance islamique conforme à la Charia
- Tu communiques en français et ton nom est ISSA

COMPORTEMENT ATTENDU :
- Réponds de manière naturelle et conversationnelle, comme un humain
- Utilise le prénom de l'utilisateur quand c'est approprié${userName ? ` (${userName})` : ''}
- Sois bienveillant, patient et à l'écoute
- Pose des questions de clarification si nécessaire
- Redirige vers le site web si tu n'as pas d'informations précises

CONNAISSANCES DISPONIBLES :
${knowledgeContext || 'Informations générales sur ROI et ROI Takaful disponibles.'}

INSTRUCTIONS IMPORTANTES :
- Si tu ne peux pas répondre précisément à une question sur nos produits ou services, dirige l'utilisateur vers notre site web www.royalonyx.cm ou www.roitakaful.com
- Reste toujours dans ton rôle d'assistant de Royal Onyx Insurance
- Sois empathique et professionnel dans toutes tes interactions`;

    return basePrompt;
  }

  /**
   * Créer un message de salutation personnalisé
   */
  createGreetingMessage(userName?: string): string {
    const greetings = [
      `Bonjour ! Je suis ISSA, votre assistant virtuel Royal Onyx Insurance. Comment allez-vous aujourd'hui ?`,
      `Salut ! C'est ISSA, votre conseiller virtuel chez Royal Onyx Insurance. Comment puis-je vous aider ?`,
      `Hello ! ISSA à votre service, assistant de Royal Onyx Insurance. J'espère que vous passez une excellente journée !`
    ];

    const greeting = greetings[Math.floor(Math.random() * greetings.length)];

    if (userName) {
      return greeting.replace('!', ` ${userName} !`);
    }

    return greeting;
  }

  /**
   * Créer un message pour demander le nom
   */
  createNameRequestMessage(): string {
    const requests = [
      "Pour mieux vous accompagner, comment puis-je vous appeler ?",
      "J'aimerais personnaliser notre conversation. Quel est votre prénom ?",
      "Comment souhaitez-vous que je vous appelle ?",
      "Pour rendre notre échange plus chaleureux, dites-moi comment vous vous appelez ?"
    ];

    return requests[Math.floor(Math.random() * requests.length)];
  }

  /**
   * Générer un message de redirection vers le site web
   */
  createWebsiteRedirection(topic: string = "cette demande"): string {
    return `Pour ${topic}, je vous invite à consulter notre site web pour des informations détaillées et à jour :
    
🌐 **Site principal :** www.royalonyx.cm
🕌 **ROI Takaful :** www.roitakaful.com
📞 **Service client :** +237 691 100 575

Notre équipe sera ravie de vous accompagner personnellement !`;
  }

  /**
   * Obtenir la configuration actuelle de l'IA
   */
  getConfig(): AIProviderConfig {
    return { ...this.aiConfig };
  }

  /**
   * Mettre à jour la configuration de l'IA
   */
  updateConfig(newConfig: Partial<AIProviderConfig>): void {
    this.aiConfig = { ...this.aiConfig, ...newConfig };
    logger.info('Configuration IA mise à jour', {
      provider: this.aiConfig.provider,
      model: this.aiConfig.model
    });
  }
}