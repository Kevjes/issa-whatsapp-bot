"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const generative_ai_1 = require("@google/generative-ai");
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
        if (config_1.config.ai.provider === 'openai')
            return 'gpt-3.5-turbo';
        if (config_1.config.ai.provider === 'gemini')
            return 'gemini-2.5-flash';
        return 'deepseek-chat';
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
            else if (this.aiConfig.provider === 'gemini') {
                aiResponse = await this.callGemini(messages);
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
    async callGemini(messages) {
        try {
            const genAI = new generative_ai_1.GoogleGenerativeAI(this.aiConfig.apiKey);
            const systemMessage = messages.find(m => m.role === 'system');
            const conversationMessages = messages.filter(m => m.role !== 'system');
            const modelConfig = { model: this.aiConfig.model };
            if (systemMessage) {
                modelConfig.systemInstruction = systemMessage.content;
            }
            const model = genAI.getGenerativeModel(modelConfig);
            let promptText = '';
            for (const msg of conversationMessages) {
                if (msg.role === 'user') {
                    promptText += `Utilisateur: ${msg.content}\n\n`;
                }
                else if (msg.role === 'assistant') {
                    promptText += `Assistant: ${msg.content}\n\n`;
                }
            }
            logger_1.logger.info('Calling Gemini API with SDK', {
                model: this.aiConfig.model,
                systemInstructionPresent: !!systemMessage,
                messageCount: conversationMessages.length
            });
            const result = await model.generateContent(promptText);
            const response = await result.response;
            const content = response.text();
            logger_1.logger.info('Gemini response received', {
                contentLength: content.length,
                tokensUsed: response.usageMetadata?.totalTokenCount
            });
            return {
                success: true,
                content,
                provider: 'gemini',
                tokensUsed: response.usageMetadata?.totalTokenCount
            };
        }
        catch (error) {
            logger_1.logger.error('Erreur API Gemini', { error });
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
- IMPORTANT : Utilise des expressions musulmanes appropriées (Salam, Alhamdulillah, In shâ Allâh, Barakallahu fik, etc.) car notre clientèle est musulmane
- TOUJOURS saluer avec "Salam" ou "Assalam alaykum" au lieu de "Bonjour"
- Intègre naturellement des expressions musulmanes quand c'est approprié

FORMATAGE IMPORTANT :
- N'utilise JAMAIS de Markdown (pas de *, **, #, ###, →, ---, etc.)
- Utilise uniquement du texte simple avec des emojis
- Pour structurer : utilise des espaces, des retours à la ligne et des emojis
- Exemple : ✅ au lieu de *, 🔹 pour les listes ou - pour faire plus naturel, 📍 pour les points importants

RÈGLES STRICTES DE RÉPONSE :
🚨 TRÈS IMPORTANT - RÈGLES ABSOLUES :
1. Tu DOIS prioritairement utiliser les informations fournies dans "CONNAISSANCES DISPONIBLES" ci-dessous
2. ANALYSE ATTENTIVEMENT le contenu des CONNAISSANCES DISPONIBLES avant de dire que tu n'as pas l'information
3. Si l'information est présente (même partiellement) dans les connaissances, utilise-la pour répondre
4. Tu NE DOIS PAS inventer de détails spécifiques (prix, dates, numéros) qui ne sont pas dans la base
5. Pour les questions générales sur les concepts (Takaful, Charia, etc.), tu PEUX répondre si l'info est dans les connaissances

CONNAISSANCES DISPONIBLES :
${knowledgeContext || 'Aucune information spécifique n\'est disponible pour cette requête.'}

PROCÉDURE DE RÉPONSE :
1. Lire ATTENTIVEMENT les CONNAISSANCES DISPONIBLES ci-dessus
2. Si l'information est présente : répondre en utilisant ces connaissances
3. Si l'information est VRAIMENT absente : dire "Je ne dispose pas de cette information précise dans ma base actuelle" et rediriger vers :
   - www.roitakaful.com pour les questions ROI Takaful
   - www.royalonyx.cm pour les questions Royal Onyx Insurance
   - +237 691 100 575 pour le service client

CE QUE TU PEUX FAIRE :
✅ Expliquer les concepts présents dans les connaissances (Takaful, Charia, produits, etc.)
✅ Répondre aux questions générales si l'info est dans la base
✅ Synthétiser et reformuler les informations disponibles
✅ Donner des exemples basés sur les connaissances fournies

CE QUE TU NE PEUX PAS FAIRE :
❌ Inventer des prix, dates ou chiffres spécifiques non mentionnés
❌ Créer de fausses garanties ou conditions contractuelles
❌ Supposer des informations commerciales ou légales
❌ Donner des conseils juridiques ou religieux au-delà des connaissances`;
        return basePrompt;
    }
    createGreetingMessage(userName) {
        if (userName) {
            const personalizedGreetings = [
                `Salam ${userName} 👋\nAlhamdulillah, quel plaisir de vous retrouver !`,
                `Assalam alaykum ${userName} 🌙\nQu'Allah vous facilite votre journée. Comment puis-je vous aider ?`,
                `Salam alaykum ${userName} 🕌\nC'est toujours un plaisir de vous accompagner. En quoi puis-je vous être utile aujourd'hui ?`
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
In shâ Allâh, je serai pour vous un compagnon utile et bienveillant tout au long de notre échange. 🌙`;
    }
    createFollowUpMessage(userName) {
        return `Alors ${userName}, dites-moi, qu'aimeriez-vous aborder aujourd'hui ?
Vous pouvez poser votre question librement, In shâ Allâh je vous répondrai avec plaisir. 😊`;
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