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
    constructor(databaseService, aiService, workflowEngine, intentClassifier, knowledgeService) {
        this.databaseService = databaseService;
        this.aiService = aiService;
        this.workflowEngine = workflowEngine;
        this.intentClassifier = intentClassifier;
        this.knowledgeService = knowledgeService;
    }
    async processMessage(phoneNumber, messageId, userMessage) {
        try {
            logger_1.logger.info('Traitement du message', {
                phoneNumber,
                messageId,
                messageLength: userMessage.length
            });
            const user = await this.databaseService.getOrCreateUser(phoneNumber);
            await this.databaseService.saveConversationMessage({
                userId: user.id,
                phoneNumber,
                messageId,
                content: userMessage,
                messageType: 'user',
                timestamp: new Date().toISOString()
            });
            const activeWorkflow = await this.workflowEngine.getActiveWorkflow(user.id);
            let response;
            if (activeWorkflow) {
                response = await this.handleWorkflowStep(user, activeWorkflow, userMessage, messageId);
            }
            else {
                response = await this.handleNoActiveWorkflow(user, userMessage, messageId);
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
            return { response: cleanResponse, shouldContinue: true };
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
    async handleWorkflowStep(user, workflowContext, userMessage, messageId) {
        try {
            logger_1.logger.info('Continuation du workflow actif', {
                userId: user.id,
                workflowId: workflowContext.workflowId,
                currentState: workflowContext.currentState
            });
            let stepResult = await this.simulateTypingWhileProcessing(user.phoneNumber, async () => await this.workflowEngine.executeStep(user.id, workflowContext, userMessage), 2000, messageId);
            if (!stepResult.success) {
                logger_1.logger.error('Erreur lors de l\'exécution du workflow', {
                    userId: user.id,
                    workflowId: workflowContext.workflowId,
                    error: stepResult.error
                });
                return stepResult.message || stepResult.error || 'Une erreur est survenue.';
            }
            let maxAutoSteps = 5;
            while (!stepResult.message && !stepResult.completed && !stepResult.stayInCurrentState && maxAutoSteps > 0) {
                logger_1.logger.info('Exécution automatique de l\'étape suivante (pas de message)', {
                    userId: user.id,
                    workflowId: workflowContext.workflowId,
                    currentState: workflowContext.currentState
                });
                const updatedContext = await this.workflowEngine.getActiveWorkflow(user.id);
                if (!updatedContext) {
                    break;
                }
                stepResult = await this.workflowEngine.executeStep(user.id, updatedContext, '');
                maxAutoSteps--;
                if (!stepResult.success) {
                    logger_1.logger.error('Erreur lors de l\'exécution automatique du workflow', {
                        userId: user.id,
                        workflowId: workflowContext.workflowId,
                        error: stepResult.error
                    });
                    return stepResult.message || stepResult.error || 'Une erreur est survenue.';
                }
            }
            if (stepResult.completed) {
                logger_1.logger.info('Workflow terminé avec succès', {
                    userId: user.id,
                    workflowId: workflowContext.workflowId
                });
                if (workflowContext.workflowId === 'name_collection') {
                    const savedContext = await this.databaseService.getWorkflowContextById(user.id, 'name_collection');
                    if (savedContext && savedContext.data.user_name) {
                        logger_1.logger.info('Sauvegarde du nom de l\'utilisateur', {
                            userId: user.id,
                            userName: savedContext.data.user_name
                        });
                        await this.databaseService.updateUserState(user.id, 'active', savedContext.data.user_name);
                        logger_1.logger.info('Nom de l\'utilisateur sauvegardé avec succès', {
                            userId: user.id,
                            userName: savedContext.data.user_name
                        });
                    }
                    else {
                        logger_1.logger.warn('Impossible de récupérer le nom depuis le contexte du workflow', {
                            userId: user.id,
                            hasContext: !!savedContext,
                            hasUserName: savedContext?.data.user_name
                        });
                    }
                }
            }
            return stepResult.message;
        }
        catch (error) {
            logger_1.logger.error('Erreur lors du traitement du workflow', {
                error,
                userId: user.id,
                workflowId: workflowContext.workflowId
            });
            await this.workflowEngine.cancelWorkflow(user.id, 'error');
            return "Une erreur est survenue. Votre demande a été annulée. Comment puis-je vous aider ?";
        }
    }
    async handleNoActiveWorkflow(user, userMessage, messageId) {
        try {
            if (!user.name) {
                logger_1.logger.info('Utilisateur sans nom détecté - démarrage du workflow name_collection', {
                    userId: user.id,
                    phoneNumber: user.phoneNumber
                });
                return await this.startNameCollectionWorkflow(user, userMessage, messageId);
            }
            if (this.isGreetingMessage(userMessage)) {
                logger_1.logger.info('Message de salutation détecté - réponse avec message personnalisé', {
                    userId: user.id,
                    userName: user.name
                });
                const greetingResponse = this.aiService.createGreetingMessage(user.name);
                const followUpMessage = this.aiService.createFollowUpMessage(user.name);
                return `${greetingResponse}\n\n${followUpMessage}`;
            }
            const intentResult = await this.intentClassifier.classifyIntent(userMessage);
            logger_1.logger.info('Intention classifiée', {
                userId: user.id,
                intent: intentResult.primaryIntent.name,
                confidence: intentResult.confidence,
                workflowId: intentResult.primaryIntent.workflowId
            });
            if (intentResult.primaryIntent.workflowId && intentResult.confidence >= 0.6) {
                logger_1.logger.info('Démarrage du workflow basé sur l\'intention', {
                    userId: user.id,
                    intent: intentResult.primaryIntent.name,
                    workflowId: intentResult.primaryIntent.workflowId
                });
                return await this.startWorkflowFromIntent(user, intentResult.primaryIntent.workflowId, userMessage, messageId);
            }
            logger_1.logger.info('Aucun workflow détecté - réponse IA générative', {
                userId: user.id,
                intent: intentResult.primaryIntent.name
            });
            return await this.handleAIConversation(user, userMessage, intentResult.primaryIntent.name, messageId);
        }
        catch (error) {
            logger_1.logger.error('Erreur lors du traitement sans workflow actif', {
                error,
                userId: user.id
            });
            return this.generateFallbackResponse(userMessage, user.name);
        }
    }
    async startNameCollectionWorkflow(user, userMessage, messageId) {
        try {
            const context = await this.simulateTypingWhileProcessing(user.phoneNumber, async () => await this.workflowEngine.startWorkflow(user.id, 'name_collection'), 1800, messageId);
            const stepResult = await this.workflowEngine.executeStep(user.id, context, userMessage);
            return stepResult.message;
        }
        catch (error) {
            logger_1.logger.error('Erreur lors du démarrage du workflow name_collection', {
                error,
                userId: user.id
            });
            return `Salam 👋 Je suis *ISSA*, votre compagnon digital chez *ROI Takaful* 🌙

Je suis là pour vous écouter, vous guider et répondre à vos questions sur nos produits d'assurance conformes à la Charia.

Avant de commencer, comment puis-je vous appeler ? ✍️
(J'aime bien savoir avec qui je discute, ça rend la conversation plus conviviale 😉)`;
        }
    }
    async startWorkflowFromIntent(user, workflowId, userMessage, messageId) {
        try {
            const context = await this.simulateTypingWhileProcessing(user.phoneNumber, async () => await this.workflowEngine.startWorkflow(user.id, workflowId), 2000, messageId);
            const stepResult = await this.workflowEngine.executeStep(user.id, context, userMessage);
            return stepResult.message;
        }
        catch (error) {
            logger_1.logger.error('Erreur lors du démarrage du workflow depuis intention', {
                error,
                userId: user.id,
                workflowId
            });
            return await this.handleAIConversation(user, userMessage, 'fallback', messageId);
        }
    }
    async handleAIConversation(user, userMessage, intentName, messageId) {
        try {
            const estimatedDuration = Math.min(Math.max(userMessage.length * 50, 2000), 8000);
            const aiResponse = await this.simulateTypingWhileProcessing(user.phoneNumber, async () => {
                const conversationHistory = await this.databaseService.getConversationHistory(user.id);
                const searchResults = await this.knowledgeService.searchByIntent(userMessage, { name: intentName, confidence: 1 }, 5);
                logger_1.logger.info('Knowledge search results', {
                    query: userMessage.substring(0, 50),
                    totalFound: searchResults.totalFound,
                    entriesCount: searchResults.entries.length,
                    topScores: searchResults.entries.slice(0, 3).map(e => e.relevanceScore),
                    topTitles: searchResults.entries.slice(0, 3).map(e => e.title)
                });
                const formattedContext = await this.knowledgeService.formatContextForAI(searchResults, 3);
                const knowledgeContext = formattedContext.formattedContext;
                logger_1.logger.info('Knowledge context for AI', {
                    contextLength: knowledgeContext.length,
                    relevantEntries: formattedContext.relevantEntries.length,
                    contextPreview: knowledgeContext.substring(0, 300)
                });
                const systemPrompt = this.aiService.createSystemPrompt(user.name, knowledgeContext);
                logger_1.logger.info('System prompt created', {
                    promptLength: systemPrompt.length,
                    hasKnowledgeContext: systemPrompt.includes('CONNAISSANCES DISPONIBLES'),
                    contextInPrompt: systemPrompt.includes(searchResults.entries[0]?.title || 'N/A')
                });
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
    generateFallbackResponse(userMessage, userName) {
        const greeting = userName ? `${userName}, ` : '';
        return `${greeting}je vous remercie pour votre message. Pour une réponse précise et détaillée, n'hésitez pas à :

🌐 Consulter notre site : www.royalonyx.cm
📞 Contacter notre service client : +237 691 100 575
📧 Nous écrire : contact@royalonyx.cm

Je reste à votre disposition pour toute autre question !`;
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
            .replace(/\*\*([^*]+)\*\*/g, '*$1*')
            .replace(/__([^_]+)__/g, '$1')
            .replace(/_([^_]+)_/g, '$1')
            .replace(/^→\s*/gm, '▶️ ')
            .replace(/→/g, '▶️')
            .replace(/^-{3,}$/gm, '')
            .replace(/^---$/gm, '')
            .replace(/^- /gm, '🔹 ')
            .replace(/^\+ /gm, '✅ ')
            .replace(/^\d+\.\s*/gm, '📍 ')
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
    isGreetingMessage(message) {
        const normalizedMessage = message.toLowerCase().trim();
        const greetingPatterns = [
            /^(salam|salam alaykoum|salam alaykum|assalam alaykoum|assalam alaykum|salamou alaykoum|salamou alaykum)\b/i,
            /^(bonjour|bonsoir|salut|hello|hi|hey)\b/i,
            /^(coucou|cc|yo)\b/i
        ];
        return greetingPatterns.some(pattern => pattern.test(normalizedMessage));
    }
    async resetConversation(phoneNumber) {
        try {
            const user = await this.databaseService.getOrCreateUser(phoneNumber);
            const activeWorkflow = await this.workflowEngine.getActiveWorkflow(user.id);
            if (activeWorkflow) {
                await this.workflowEngine.cancelWorkflow(user.id, 'reset');
            }
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