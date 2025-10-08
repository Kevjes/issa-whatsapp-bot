"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class AIService {
    constructor(httpClient) {
        this.httpClient = httpClient;
        this.aiConfig = {
            provider: config_1.config.ai.provider,
            apiKey: config_1.config.ai.apiKey,
            model: config_1.config.ai.model,
            baseUrl: config_1.config.ai.baseUrl
        };
        logger_1.logger.info('AI Service initialized', {
            provider: this.aiConfig.provider,
            model: this.aiConfig.model,
            hasApiKey: !!this.aiConfig.apiKey
        });
    }
    getDefaultModel() {
        return config_1.config.ai.provider === 'openai' ? 'gpt-3.5-turbo' : 'deepseek-chat';
    }
    async generateResponse(userMessage, conversationHistory = [], systemPrompt) {
        try {
            if (!this.aiConfig.apiKey) {
                throw new Error(`Clé API manquante pour ${this.aiConfig.provider}`);
            }
            const messages = this.buildMessages(userMessage, conversationHistory, systemPrompt);
            let aiResponse;
            if (this.aiConfig.provider === 'openai') {
                aiResponse = await this.callOpenAI(messages);
            }
            else {
                aiResponse = await this.callDeepSeek(messages);
            }
            if (aiResponse.success && aiResponse.content) {
                const validation = this.validateResponse(aiResponse.content, systemPrompt || '');
                if (!validation.isValid) {
                    logger_1.logger.warn('Réponse IA rejetée par validation', {
                        reason: validation.reason,
                        responsePreview: aiResponse.content.substring(0, 100)
                    });
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
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de la génération de réponse IA', {
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
    buildMessages(userMessage, conversationHistory, systemPrompt) {
        const messages = [];
        if (systemPrompt) {
            messages.push({
                role: 'system',
                content: systemPrompt
            });
        }
        const recentHistory = conversationHistory.slice(-20);
        for (const msg of recentHistory) {
            messages.push({
                role: msg.messageType === 'user' ? 'user' : 'assistant',
                content: msg.content
            });
        }
        messages.push({
            role: 'user',
            content: userMessage
        });
        return messages;
    }
    async callOpenAI(messages) {
        try {
            const requestData = {
                model: this.aiConfig.model,
                messages,
                temperature: 0.7,
                max_tokens: 1000
            };
            const response = await this.httpClient.post('/chat/completions', requestData);
            const data = response.data;
            if (data.choices && data.choices.length > 0) {
                return {
                    success: true,
                    content: data.choices[0].message.content,
                    provider: 'openai',
                    tokensUsed: data.usage?.total_tokens
                };
            }
            else {
                throw new Error('Aucune réponse reçue d\'OpenAI');
            }
        }
        catch (error) {
            logger_1.logger.error('Erreur API OpenAI', { error });
            throw error;
        }
    }
    async callDeepSeek(messages) {
        try {
            const requestData = {
                model: this.aiConfig.model,
                messages,
                temperature: 0.7,
                max_tokens: 1000,
                stream: false
            };
            const response = await this.httpClient.post('/chat/completions', requestData);
            const data = response.data;
            if (data.choices && data.choices.length > 0) {
                return {
                    success: true,
                    content: data.choices[0].message.content,
                    provider: 'deepseek',
                    tokensUsed: data.usage?.total_tokens
                };
            }
            else {
                throw new Error('Aucune réponse reçue de DeepSeek');
            }
        }
        catch (error) {
            logger_1.logger.error('Erreur API DeepSeek', { error });
            throw error;
        }
    }
    createSystemPrompt(userName, knowledgeContext) {
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
    createGreetingMessage(userName) {
        if (userName) {
            const personalizedGreetings = [
                `Salam ${userName} 👋\nAlhamdulillah, quel plaisir de vous revoir !`,
                `Bonjour ${userName} ! 🌟\nJe suis ravi de poursuivre notre conversation.`,
                `Assalam alaykum ${userName} 🌙\nComment allez-vous aujourd'hui ?`
            ];
            return personalizedGreetings[Math.floor(Math.random() * personalizedGreetings.length)];
        }
        return `Salam 👋 Je suis ISSA, votre compagnon digital chez ROI Takaful 🌙.

Je suis là pour vous écouter, vous guider et répondre à vos questions.

Avant de commencer, comment puis-je vous appeler ? ✍️
(J'aime bien savoir avec qui je discute, ça rend la conversation plus conviviale 😉)`;
    }
    createNameRequestMessage() {
        return "Comment puis-je vous appeler ?";
    }
    createWelcomeAfterNameMessage(userName) {
        return `Enchanté ${userName} 🤗 !
Alhamdulillah, c'est un vrai plaisir de faire votre connaissance.
In shâ Allâh, je serai pour vous un compagnon utile et bienveillant tout au long de notre échange.`;
    }
    createFollowUpMessage(userName) {
        return `Alors ${userName}, dites-moi, qu'aimeriez-vous aborder aujourd'hui ?
Vous pouvez poser votre question librement, je vous réponds directement.`;
    }
    createWebsiteRedirection(topic = "cette demande") {
        return `Pour ${topic}, je vous invite à consulter notre site web pour des informations détaillées et à jour :

🌐 Site principal : www.royalonyx.cm
🕌 ROI Takaful : www.roitakaful.com
📞 Service client : +237 691 100 575

Notre équipe sera ravie de vous accompagner personnellement !`;
    }
    validateResponse(response, knowledgeContext) {
        const forbiddenPhrases = [
            'généralement', 'habituellement', 'en général', 'typiquement',
            'probablement', 'il est possible que', 'on peut supposer',
            'les valeurs sont souvent', 'comme la plupart des entreprises'
        ];
        const responseLength = response.toLowerCase();
        for (const phrase of forbiddenPhrases) {
            if (responseLength.includes(phrase)) {
                return {
                    isValid: false,
                    reason: `Réponse contient une phrase interdite: "${phrase}"`
                };
            }
        }
        if ((!knowledgeContext || knowledgeContext.includes('Aucune information spécifique'))
            && response.length > 200 && !response.includes('Je ne dispose pas')) {
            return {
                isValid: false,
                reason: 'Réponse trop détaillée sans contexte de connaissances'
            };
        }
        return { isValid: true };
    }
    getConfig() {
        return { ...this.aiConfig };
    }
    updateConfig(newConfig) {
        this.aiConfig = { ...this.aiConfig, ...newConfig };
        logger_1.logger.info('Configuration IA mise à jour', {
            provider: this.aiConfig.provider,
            model: this.aiConfig.model
        });
    }
}
exports.AIService = AIService;
//# sourceMappingURL=aiService.js.map