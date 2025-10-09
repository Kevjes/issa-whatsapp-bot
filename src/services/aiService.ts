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
    if (config.ai.provider === 'openai') return 'gpt-3.5-turbo';
    if (config.ai.provider === 'gemini') return 'gemini-2.5-flash';
    return 'deepseek-chat';
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

      let aiResponse: AIResponse;
      if (this.aiConfig.provider === 'openai') {
        aiResponse = await this.callOpenAI(messages);
      } else if (this.aiConfig.provider === 'gemini') {
        aiResponse = await this.callGemini(messages);
      } else {
        aiResponse = await this.callDeepSeek(messages);
      }

      // Valider la réponse
      if (aiResponse.success && aiResponse.content) {
        const validation = this.validateResponse(aiResponse.content, systemPrompt || '');

        if (!validation.isValid) {
          logger.warn('Réponse IA rejetée par validation', {
            reason: validation.reason,
            responsePreview: aiResponse.content.substring(0, 100)
          });

          // Retourner une réponse sécurisée
          return {
            success: true,
            content: `Je ne dispose pas de cette information dans ma base de connaissances actuelle.

📍 Pour obtenir une réponse précise et officielle, je vous invite à :

🔸 Consulter notre site web : www.roitakaful.com
🔸 Contacter notre service client : +237 691 100 575
🔸 Nous écrire : contact@roitakaful.com

Je reste à votre disposition pour toute question sur nos produits et services documentés !`,
            provider: this.aiConfig.provider
          };
        }
      }

      return aiResponse;

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
   * Appeler l'API Google Gemini
   */
  private async callGemini(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): Promise<AIResponse> {
    try {
      // Gemini utilise un format différent: systemInstruction séparé + contents
      const systemMessage = messages.find(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');

      // Convertir les messages au format Gemini
      const contents = conversationMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const requestData: any = {
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
          topP: 0.95
        }
      };

      // Ajouter systemInstruction si présent
      if (systemMessage) {
        requestData.systemInstruction = {
          parts: [{ text: systemMessage.content }]
        };
      }

      // Endpoint Gemini (sans API key dans l'URL)
      const endpoint = `/models/${this.aiConfig.model}:generateContent`;

      // Gemini nécessite l'API key dans le header x-goog-api-key
      const response = await this.httpClient.post(endpoint, requestData, {
        headers: {
          'x-goog-api-key': this.aiConfig.apiKey,
          'Content-Type': 'application/json'
        }
      });

      const data = response.data as any;

      if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        const content = candidate.content?.parts?.[0]?.text;

        if (content) {
          return {
            success: true,
            content,
            provider: 'gemini',
            tokensUsed: data.usageMetadata?.totalTokenCount
          };
        } else {
          throw new Error('Aucun contenu dans la réponse Gemini');
        }
      } else {
        throw new Error('Aucune réponse reçue de Gemini');
      }

    } catch (error: unknown) {
      logger.error('Erreur API Gemini', { error });
      throw error;
    }
  }

  /**
   * Créer un prompt système pour ISSA
   */
  createSystemPrompt(userName?: string, knowledgeContext?: string): string {
    const basePrompt = `Tu es ISSA, l'assistant virtuel de ROI Takaful, entreprise spécialisée en assurances islamiques.

INFORMATIONS SUR TOI :
- Tu es un assistant bienveillant, professionnel et chaleureux
- Tu représentes ROI Takaful, une entreprise d'assurances islamiques conformes à la Charia
- ROI Takaful est une filiale de Royal Onyx Insurance (entreprise mère)
- Tu es spécialisé dans les assurances islamiques mais peux aussi renseigner sur Royal Onyx
- Tu communiques en français et ton nom est ISSA

COMPORTEMENT ATTENDU :
- Réponds de manière naturelle et conversationnelle, comme un humain
- Utilise le prénom de l'utilisateur quand c'est approprié${userName ? ` (${userName})` : ''}
- Sois bienveillant, patient et à l'écoute
- Pose des questions de clarification si nécessaire

FORMATAGE IMPORTANT :
- N'utilise JAMAIS de Markdown (pas de *, **, #, ###, →, ---, etc.)
- Utilise uniquement du texte simple avec des emojis
- Pour structurer : utilise des espaces, des retours à la ligne et des emojis
- Exemple : ✅ au lieu de *, 🔹 pour les listes ou - pour faire plus naturel, 📍 pour les points importants

RÈGLES STRICTES DE RÉPONSE :
🚨 TRÈS IMPORTANT - RÈGLES ABSOLUES :
1. Tu DOIS EXCLUSIVEMENT utiliser les informations fournies dans "CONNAISSANCES DISPONIBLES" ci-dessous
2. Tu NE DOIS JAMAIS inventer, supposer ou extrapoler des informations
3. Si l'information n'est PAS dans les connaissances fournies, tu DOIS dire : "Je ne dispose pas de cette information dans ma base de connaissances actuelle"
4. Tu NE DOIS PAS donner d'informations générales ou supposées même si elles semblent logiques
5. SEULES les informations exactes de la base de connaissances peuvent être utilisées

CONNAISSANCES DISPONIBLES :
${knowledgeContext || 'Aucune information spécifique n\'est disponible pour cette requête.'}

PROCÉDURE DE RÉPONSE :
1. Vérifier si l'information demandée est dans les CONNAISSANCES DISPONIBLES
2. Si OUI : répondre avec les informations exactes de la base
3. Si NON : dire "Je ne dispose pas de cette information" et rediriger vers :
   - www.roitakaful.com pour les questions ROI Takaful
   - www.royalonyx.cm pour les questions Royal Onyx Insurance
   - +237 691 100 575 pour le service client

INTERDICTIONS ABSOLUES :
❌ Ne jamais inventer de valeurs d'entreprise
❌ Ne jamais supposer des dates ou des chiffres
❌ Ne jamais donner d'informations "générales" sur l'assurance
❌ Ne jamais extrapoler au-delà des connaissances fournies`;

    return basePrompt;
  }

  /**
   * Créer un message de salutation personnalisé
   */
  createGreetingMessage(userName?: string): string {
    if (userName) {
      // Messages de salutation quand on connaît déjà le nom
      const personalizedGreetings = [
        `Salam ${userName} 👋\nAlhamdulillah, quel plaisir de vous revoir !`,
        `Bonjour ${userName} ! 🌟\nJe suis ravi de poursuivre notre conversation.`,
        `Assalam alaykum ${userName} 🌙\nComment allez-vous aujourd'hui ?`
      ];
      return personalizedGreetings[Math.floor(Math.random() * personalizedGreetings.length)];
    }

    // Message de première salutation avec demande de nom (comme dans votre exemple)
    return `Salam 👋 Je suis ISSA, votre compagnon digital chez ROI Takaful 🌙.

Je suis là pour vous écouter, vous guider et répondre à vos questions.

Avant de commencer, comment puis-je vous appeler ? ✍️
(J'aime bien savoir avec qui je discute, ça rend la conversation plus conviviale 😉)`;
  }

  /**
   * Créer un message pour demander le nom (maintenant intégré dans createGreetingMessage)
   */
  createNameRequestMessage(): string {
    // Cette méthode est maintenant obsolète car le message de demande de nom
    // est intégré directement dans createGreetingMessage() pour correspondre à votre exemple
    return "Comment puis-je vous appeler ?";
  }

  /**
   * Créer le message de bienvenue personnalisé après collecte du nom
   */
  createWelcomeAfterNameMessage(userName: string): string {
    return `Enchanté ${userName} 🤗 !
Alhamdulillah, c'est un vrai plaisir de faire votre connaissance.
In shâ Allâh, je serai pour vous un compagnon utile et bienveillant tout au long de notre échange.`;
  }

  /**
   * Créer le message de suivi pour relancer naturellement la conversation
   */
  createFollowUpMessage(userName: string): string {
    return `Alors ${userName}, dites-moi, qu'aimeriez-vous aborder aujourd'hui ?
Vous pouvez poser votre question librement, je vous réponds directement.`;
  }

  /**
   * Générer un message de redirection vers le site web
   */
  createWebsiteRedirection(topic: string = "cette demande"): string {
    return `Pour ${topic}, je vous invite à consulter notre site web pour des informations détaillées et à jour :

🌐 Site principal : www.royalonyx.cm
🕌 ROI Takaful : www.roitakaful.com
📞 Service client : +237 691 100 575

Notre équipe sera ravie de vous accompagner personnellement !`;
  }

  /**
   * Valider la réponse de l'IA pour s'assurer qu'elle respecte les règles
   */
  private validateResponse(response: string, knowledgeContext: string): { isValid: boolean; reason?: string } {
    // Mots interdits qui indiquent une invention d'informations
    const forbiddenPhrases = [
      'généralement', 'habituellement', 'en général', 'typiquement',
      'probablement', 'il est possible que', 'on peut supposer',
      'les valeurs sont souvent', 'comme la plupart des entreprises'
    ];

    // Vérifier la présence de phrases interdites
    const responseLength = response.toLowerCase();
    for (const phrase of forbiddenPhrases) {
      if (responseLength.includes(phrase)) {
        return {
          isValid: false,
          reason: `Réponse contient une phrase interdite: "${phrase}"`
        };
      }
    }

    // Si pas de contexte de connaissances et que la réponse est longue et détaillée
    if ((!knowledgeContext || knowledgeContext.includes('Aucune information spécifique'))
        && response.length > 200 && !response.includes('Je ne dispose pas')) {
      return {
        isValid: false,
        reason: 'Réponse trop détaillée sans contexte de connaissances'
      };
    }

    return { isValid: true };
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