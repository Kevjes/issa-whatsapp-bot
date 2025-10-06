"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationService = void 0;
const logger_1 = require("../utils/logger");
class ConversationService {
    constructor(databaseService, aiService, knowledgeService) {
        this.databaseService = databaseService;
        this.aiService = aiService;
        this.knowledgeService = knowledgeService;
    }
    async processMessage(phoneNumber, messageId, userMessage) {
        try {
            logger_1.logger.info('Traitement du message', {
                phoneNumber,
                messageId,
                messageLength: userMessage.length
            });
            let user = await this.databaseService.getOrCreateUser(phoneNumber);
            if (!user.name && user.conversationState !== 'greeting' && user.conversationState !== 'name_collection') {
                logger_1.logger.info('Utilisateur sans nom détecté dans un état incorrect - réinitialisation', {
                    userId: user.id,
                    phoneNumber,
                    currentState: user.conversationState
                });
                await this.databaseService.updateUserState(user.id, 'greeting');
                user = { ...user, conversationState: 'greeting' };
            }
            if (this.isGreetingMessage(userMessage) && user.conversationState !== 'greeting' && user.conversationState !== 'name_collection') {
                await this.databaseService.updateUserState(user.id, 'greeting');
                user = { ...user, conversationState: 'greeting' };
                user.isGreetingReset = true;
                logger_1.logger.info('Conversation réinitialisée suite à message de salutation', { userId: user.id, phoneNumber });
            }
            await this.databaseService.saveConversationMessage({
                userId: user.id,
                phoneNumber,
                messageId,
                content: userMessage,
                messageType: 'user',
                timestamp: new Date().toISOString()
            });
            let response;
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
            const cleanResponse = this.cleanMarkdownForWhatsApp(response);
            await this.databaseService.saveConversationMessage({
                userId: user.id,
                phoneNumber,
                messageId: `bot_${Date.now()}`,
                content: cleanResponse,
                messageType: 'bot',
                timestamp: new Date().toISOString(),
                aiProvider: this.aiService.getConfig().provider
            });
            return { response: cleanResponse, shouldContinue };
        }
        catch (error) {
            logger_1.logger.error('Erreur lors du traitement du message', {
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
    async handleGreeting(user, userMessage, messageId) {
        try {
            const nameMatch = this.extractNameFromMessage(userMessage);
            if (nameMatch && !this.isInvalidName(nameMatch)) {
                return await this.simulateTypingWhileProcessing(user.phoneNumber, async () => {
                    await this.databaseService.updateUserState(user.id, 'active', nameMatch);
                    const greeting = this.aiService.createGreetingMessage(nameMatch);
                    return `${greeting}\n\nComment puis-je vous aider aujourd'hui ?`;
                }, 2000, messageId);
            }
            if (user.isGreetingReset) {
                const staticGreetingMessage = `Salam 👋 Je suis ISSA, votre compagnon digital chez ROI Takaful 🌙.

Je suis là pour vous écouter, vous guider et répondre à vos questions.

Avant de commencer, comment puis-je vous appeler ? ✍️
(J'aime bien savoir avec qui je discute, ça rend la conversation plus conviviale 😉)`;
                return await this.simulateTypingWhileProcessing(user.phoneNumber, async () => {
                    await this.databaseService.updateUserState(user.id, 'name_collection');
                    return staticGreetingMessage;
                }, 1800, messageId);
            }
            if (!user.name) {
                const staticGreetingMessage = `Salam 👋 Je suis ISSA, votre compagnon digital chez ROI Takaful 🌙.

Je suis là pour vous écouter, vous guider et répondre à vos questions.

Avant de commencer, comment puis-je vous appeler ? ✍️
(J'aime bien savoir avec qui je discute, ça rend la conversation plus conviviale 😉)`;
                return await this.simulateTypingWhileProcessing(user.phoneNumber, async () => {
                    await this.databaseService.updateUserState(user.id, 'name_collection', undefined, userMessage);
                    return staticGreetingMessage;
                }, 1800, messageId);
            }
            return await this.simulateTypingWhileProcessing(user.phoneNumber, async () => {
                await this.databaseService.updateUserState(user.id, 'active');
                return this.aiService.createGreetingMessage(user.name);
            }, 1800, messageId);
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de la gestion de la salutation', { error, userId: user.id });
            throw error;
        }
    }
    async handleNameCollection(user, userMessage, messageId) {
        try {
            const name = this.extractNameFromMessage(userMessage) || userMessage.trim();
            if (name.length < 2 || name.length > 50 || this.isInvalidName(name)) {
                return "Je n'ai pas bien compris votre nom. Pouvez-vous me dire comment vous vous appelez ?";
            }
            return await this.simulateTypingWhileProcessing(user.phoneNumber, async () => {
                await this.databaseService.updateUserState(user.id, 'active', name, null);
                if (user.pendingMessage) {
                    logger_1.logger.info('Traitement du message en attente après collecte du nom', {
                        userId: user.id,
                        name,
                        pendingMessage: user.pendingMessage
                    });
                    this.schedulePendingMessageResponse(user, name, user.pendingMessage);
                    return this.aiService.createWelcomeAfterNameMessage(name);
                }
                const welcomeMessage = this.aiService.createWelcomeAfterNameMessage(name);
                this.scheduleFollowUpMessage(user, name);
                return welcomeMessage;
            }, 2500, messageId);
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de la collecte du nom', { error, userId: user.id });
            throw error;
        }
    }
    async handleActiveConversation(user, userMessage, messageId) {
        try {
            const estimatedDuration = Math.min(Math.max(userMessage.length * 50, 2000), 8000);
            const aiResponse = await this.simulateTypingWhileProcessing(user.phoneNumber, async () => {
                const conversationHistory = await this.databaseService.getConversationHistory(user.id);
                const knowledgeContext = await this.knowledgeService.getContextForQuery(userMessage);
                const systemPrompt = this.aiService.createSystemPrompt(user.name, knowledgeContext);
                return await this.aiService.generateResponse(userMessage, conversationHistory, systemPrompt);
            }, estimatedDuration, messageId);
            if (!aiResponse.success || !aiResponse.content) {
                logger_1.logger.warn('Échec de la génération IA, utilisation de la réponse de fallback', {
                    error: aiResponse.error,
                    userId: user.id
                });
                return this.generateFallbackResponse(userMessage, user.name);
            }
            await this.databaseService.updateUserState(user.id, 'active');
            return aiResponse.content;
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de la conversation active', { error, userId: user.id });
            return this.generateFallbackResponse(userMessage, user.name);
        }
    }
    extractNameFromMessage(message) {
        const cleanMessage = message.trim();
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
        if (cleanMessage.length >= 2 && cleanMessage.length <= 30 &&
            /^[a-zA-ZÀ-ÿ\s]+$/.test(cleanMessage) &&
            !this.isInvalidName(cleanMessage)) {
            return cleanMessage;
        }
        return null;
    }
    isInvalidName(name) {
        const invalidPatterns = [
            /^\d+$/,
            /^[!@#$%^&*()]+$/,
            /^(bonjour|salut|hello|hi|hey|salam|assalam|bonsoir|bonne\s*journée|ok|oui|non|merci|d'?accord)$/i,
            /^.{1}$/,
            /^\s+$/,
            /\?/,
            /^(c'est|cest|qu'est|quest|quoi|comment|pourquoi|qui|quand|où|ou|est-ce|quel|quelle)/i,
            /(quoi|comment|pourquoi|qui|quand|où|quel|quelle)\s+/i
        ];
        return invalidPatterns.some(pattern => pattern.test(name));
    }
    isGreetingMessage(message) {
        const greetingPatterns = [
            /^(salut|bonjour|bonsoir|hello|hi|salam|assalam|peace)\s*$/i,
            /^(salut|bonjour|bonsoir|hello|hi|salam)\s*[!.]*\s*$/i,
            /^(assalam\s*alaykum|assalamou\s*alaykoum|salam\s*alaykoum)\s*[!.]*\s*$/i
        ];
        const cleanMessage = message.trim();
        return greetingPatterns.some(pattern => pattern.test(cleanMessage));
    }
    generateFallbackResponse(userMessage, userName) {
        const greeting = userName ? `${userName}, ` : '';
        if (this.knowledgeService.isTakafulQuery(userMessage)) {
            return `${greeting}pour les questions concernant nos produits Takaful conformes à la Charia, je vous invite à consulter notre site spécialisé :\n\n🕌 ROI Takaful : www.roitakaful.com\n📞 Service client : +237 691 100 575\n\nNotre équipe vous accompagnera avec plaisir !`;
        }
        const keywords = this.knowledgeService.identifyRelevantKeywords(userMessage);
        if (keywords.length > 0) {
            return this.aiService.createWebsiteRedirection(`votre question sur ${keywords.join(', ')}`);
        }
        return `${greeting}je vous remercie pour votre message. Pour une réponse précise et détaillée, n'hésitez pas à :\n\n🌐 Consulter notre site : www.royalonyx.cm\n📞 Contacter notre service client : +237 691 100 575\n📧 Nous écrire : contact@royalonyx.cm\n\nJe reste à votre disposition pour toute autre question !`;
    }
    async getConversationContext(phoneNumber) {
        try {
            const user = await this.databaseService.getOrCreateUser(phoneNumber);
            const conversationHistory = await this.databaseService.getConversationHistory(user.id);
            return {
                userId: user.id,
                phoneNumber: user.phoneNumber,
                userName: user.name,
                conversationHistory,
                lastInteraction: user.lastInteraction || new Date().toISOString(),
                state: user.conversationState
            };
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de la récupération du contexte', { error, phoneNumber });
            return null;
        }
    }
    cleanMarkdownForWhatsApp(text) {
        return text
            .replace(/^#{1,6}\s+/gm, '')
            .replace(/^### (.+)$/gm, '📋 $1')
            .replace(/^## (.+)$/gm, '📌 $1')
            .replace(/^# (.+)$/gm, '🎯 $1')
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/__([^_]+)__/g, '$1')
            .replace(/_([^_]+)_/g, '$1')
            .replace(/^→\s*/gm, '▶️ ')
            .replace(/→/g, '▶️')
            .replace(/^-{3,}$/gm, '')
            .replace(/^---$/gm, '')
            .replace(/^- /gm, '🔹 ')
            .replace(/^\+ /gm, '✅ ')
            .replace(/^\d+\.\s*/gm, '📍 ')
            .replace(/\*Ce dont nous avons parlé\*/g, '💬 Ce dont nous avons parlé')
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .replace(/\s+$/gm, '')
            .trim();
    }
    async simulateTypingWhileProcessing(phoneNumber, processingFunction, estimatedDuration = 3000, messageId) {
        const { container, TOKENS } = await Promise.resolve().then(() => __importStar(require('../core')));
        const whatsappService = await container.resolve(TOKENS.WHATSAPP_SERVICE);
        await whatsappService.sendTypingIndicator(phoneNumber, messageId);
        try {
            const minDelay = Math.max(1500, Math.min(estimatedDuration * 0.3, 2500));
            const [result] = await Promise.all([
                processingFunction(),
                this.simulateRealisticTypingDelay(minDelay, estimatedDuration)
            ]);
            return result;
        }
        finally {
        }
    }
    async simulateRealisticTypingDelay(minDelay, maxDelay) {
        const variation = 0.2;
        const randomFactor = 1 + (Math.random() - 0.5) * variation;
        const delay = Math.max(minDelay, Math.min(maxDelay * randomFactor, maxDelay));
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    schedulePendingMessageResponse(user, userName, pendingMessage) {
        setTimeout(async () => {
            try {
                const { container, TOKENS } = await Promise.resolve().then(() => __importStar(require('../core')));
                const whatsappService = await container.resolve(TOKENS.WHATSAPP_SERVICE);
                await whatsappService.sendTypingIndicator(user.phoneNumber);
                const conversationHistory = await this.databaseService.getConversationHistory(user.id);
                const knowledgeContext = await this.knowledgeService.getContextForQuery(pendingMessage);
                const systemPrompt = this.aiService.createSystemPrompt(userName, knowledgeContext);
                const aiResponse = await this.aiService.generateResponse(pendingMessage, conversationHistory, systemPrompt);
                if (aiResponse.success && aiResponse.content) {
                    const cleanMessage = this.cleanMarkdownForWhatsApp(aiResponse.content);
                    await this.databaseService.saveConversationMessage({
                        userId: user.id,
                        phoneNumber: user.phoneNumber,
                        messageId: `pending_response_${Date.now()}`,
                        content: cleanMessage,
                        messageType: 'bot',
                        timestamp: new Date().toISOString(),
                        aiProvider: this.aiService.getConfig().provider
                    });
                    await whatsappService.sendMessage(user.phoneNumber, cleanMessage);
                    logger_1.logger.info('Message en attente traité et réponse envoyée', {
                        phoneNumber: user.phoneNumber,
                        userName,
                        pendingMessage
                    });
                }
            }
            catch (error) {
                logger_1.logger.error('Erreur lors du traitement du message en attente', {
                    error,
                    phoneNumber: user.phoneNumber,
                    userName,
                    pendingMessage
                });
            }
        }, 3000);
    }
    scheduleFollowUpMessage(user, userName) {
        setTimeout(async () => {
            try {
                const { container, TOKENS } = await Promise.resolve().then(() => __importStar(require('../core')));
                const whatsappService = await container.resolve(TOKENS.WHATSAPP_SERVICE);
                await whatsappService.sendTypingIndicator(user.phoneNumber);
                await new Promise(resolve => setTimeout(resolve, 1500));
                const followUpMessage = this.aiService.createFollowUpMessage(userName);
                const cleanMessage = this.cleanMarkdownForWhatsApp(followUpMessage);
                await this.databaseService.saveConversationMessage({
                    userId: user.id,
                    phoneNumber: user.phoneNumber,
                    messageId: `followup_${Date.now()}`,
                    content: cleanMessage,
                    messageType: 'bot',
                    timestamp: new Date().toISOString(),
                    aiProvider: this.aiService.getConfig().provider
                });
                await whatsappService.sendMessage(user.phoneNumber, cleanMessage);
                logger_1.logger.debug('Message de suivi envoyé', {
                    phoneNumber: user.phoneNumber,
                    userName
                });
            }
            catch (error) {
                logger_1.logger.error('Erreur lors de l\'envoi du message de suivi', {
                    error,
                    phoneNumber: user.phoneNumber,
                    userName
                });
            }
        }, 2000);
    }
    async sendBotMessage(user, message, messageId) {
        try {
            const cleanMessage = this.cleanMarkdownForWhatsApp(message);
            await this.databaseService.saveConversationMessage({
                userId: user.id,
                phoneNumber: user.phoneNumber,
                messageId,
                content: cleanMessage,
                messageType: 'bot',
                timestamp: new Date().toISOString(),
                aiProvider: this.aiService.getConfig().provider
            });
            const { container, TOKENS } = await Promise.resolve().then(() => __importStar(require('../core')));
            const whatsappService = await container.resolve(TOKENS.WHATSAPP_SERVICE);
            await whatsappService.sendMessage(user.phoneNumber, cleanMessage);
            logger_1.logger.debug('Message bot envoyé', {
                phoneNumber: user.phoneNumber,
                messageId,
                messageLength: cleanMessage.length
            });
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de l\'envoi du message bot', {
                error,
                phoneNumber: user.phoneNumber,
                messageId
            });
            throw error;
        }
    }
    async resetConversation(phoneNumber) {
        try {
            const user = await this.databaseService.getOrCreateUser(phoneNumber);
            await this.databaseService.updateUserState(user.id, 'greeting');
            logger_1.logger.info('Conversation réinitialisée', { phoneNumber, userId: user.id });
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de la réinitialisation', { error, phoneNumber });
            throw error;
        }
    }
}
exports.ConversationService = ConversationService;
//# sourceMappingURL=conversationService.js.map