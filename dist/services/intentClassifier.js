"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentClassifier = void 0;
const logger_1 = require("../utils/logger");
class IntentClassifier {
    constructor(config) {
        this.intents = new Map();
        this.entityExtractors = new Map();
        this.cache = new Map();
        this.config = {
            confidenceThreshold: config?.confidenceThreshold || 0.6,
            maxAlternatives: config?.maxAlternatives || 3,
            useAI: config?.useAI !== undefined ? config.useAI : false,
            useCaching: config?.useCaching !== undefined ? config.useCaching : true,
            fallbackIntent: config?.fallbackIntent || 'unknown',
            enableEntityExtraction: config?.enableEntityExtraction !== undefined ? config.enableEntityExtraction : true
        };
        logger_1.logger.info('IntentClassifier initialized', { config: this.config });
        this.registerDefaultIntents();
    }
    async classifyIntent(message, context) {
        const startTime = Date.now();
        try {
            const normalizedMessage = this.normalizeMessage(message);
            if (this.config.useCaching) {
                const cacheKey = this.getCacheKey(normalizedMessage, context);
                const cached = this.cache.get(cacheKey);
                if (cached) {
                    logger_1.logger.debug('Intent classification from cache', { message: normalizedMessage });
                    return cached;
                }
            }
            const keywordIntent = await this.classifyByKeywords(normalizedMessage);
            const patternIntent = await this.classifyByPatterns(normalizedMessage);
            let primaryIntent;
            let method;
            const alternativeIntents = [];
            if (keywordIntent && patternIntent) {
                if (keywordIntent.confidence >= patternIntent.confidence) {
                    primaryIntent = keywordIntent;
                    alternativeIntents.push(patternIntent);
                    method = 'keyword';
                }
                else {
                    primaryIntent = patternIntent;
                    alternativeIntents.push(keywordIntent);
                    method = 'pattern';
                }
            }
            else if (keywordIntent) {
                primaryIntent = keywordIntent;
                method = 'keyword';
            }
            else if (patternIntent) {
                primaryIntent = patternIntent;
                method = 'pattern';
            }
            else {
                primaryIntent = {
                    name: this.config.fallbackIntent,
                    confidence: 0.3,
                    category: 'unknown'
                };
                method = 'keyword';
            }
            if (this.config.useAI && primaryIntent.confidence < this.config.confidenceThreshold) {
            }
            let entities = [];
            if (this.config.enableEntityExtraction) {
                entities = await this.extractEntities(normalizedMessage, context);
            }
            primaryIntent.entities = entities;
            const processingTime = Date.now() - startTime;
            const result = {
                primaryIntent,
                alternativeIntents: alternativeIntents.slice(0, this.config.maxAlternatives),
                entities,
                confidence: primaryIntent.confidence,
                method,
                processingTime
            };
            if (this.config.useCaching) {
                const cacheKey = this.getCacheKey(normalizedMessage, context);
                this.cache.set(cacheKey, result);
            }
            logger_1.logger.info('Intent classified', {
                message: normalizedMessage.substring(0, 50),
                intent: primaryIntent.name,
                confidence: primaryIntent.confidence,
                method,
                processingTime
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Error classifying intent', {
                message,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                primaryIntent: {
                    name: this.config.fallbackIntent,
                    confidence: 0,
                    category: 'unknown'
                },
                entities: [],
                confidence: 0,
                method: 'keyword',
                processingTime: Date.now() - startTime
            };
        }
    }
    async classifyByKeywords(message) {
        const lowerMessage = message.toLowerCase();
        let bestIntent = null;
        let bestScore = 0;
        for (const intentDef of this.intents.values()) {
            let score = 0;
            let matchedKeywords = 0;
            for (const keywordGroup of intentDef.keywords) {
                let groupMatched = true;
                for (const keyword of keywordGroup) {
                    if (!lowerMessage.includes(keyword.toLowerCase())) {
                        groupMatched = false;
                        break;
                    }
                }
                if (groupMatched) {
                    matchedKeywords += keywordGroup.length;
                    score += keywordGroup.length * 0.2;
                }
            }
            if (intentDef.examples) {
                for (const example of intentDef.examples) {
                    if (lowerMessage === example.toLowerCase()) {
                        score += 0.5;
                        break;
                    }
                }
            }
            if (intentDef.priority) {
                score *= (1 + intentDef.priority * 0.1);
            }
            const normalizedScore = Math.min(score, 1.0);
            if (normalizedScore > bestScore) {
                bestScore = normalizedScore;
                bestIntent = {
                    name: intentDef.name,
                    confidence: normalizedScore,
                    category: intentDef.category,
                    workflowId: intentDef.workflowId,
                    metadata: intentDef.metadata
                };
            }
        }
        return bestIntent;
    }
    async classifyByPatterns(message) {
        let bestIntent = null;
        let bestScore = 0;
        for (const intentDef of this.intents.values()) {
            if (!intentDef.patterns || intentDef.patterns.length === 0) {
                continue;
            }
            for (const pattern of intentDef.patterns) {
                const match = message.match(pattern);
                if (match) {
                    const matchLength = match[0].length;
                    const score = Math.min(matchLength / message.length, 0.9);
                    const priorityMultiplier = intentDef.priority ? (1 + intentDef.priority * 0.1) : 1;
                    const finalScore = score * priorityMultiplier;
                    if (finalScore > bestScore) {
                        bestScore = finalScore;
                        bestIntent = {
                            name: intentDef.name,
                            confidence: finalScore,
                            category: intentDef.category,
                            workflowId: intentDef.workflowId,
                            metadata: intentDef.metadata
                        };
                    }
                }
            }
        }
        return bestIntent;
    }
    async extractEntities(message, context) {
        const entities = [];
        for (const extractor of this.entityExtractors.values()) {
            try {
                const extracted = await extractor.extract(message, context);
                entities.push(...extracted);
            }
            catch (error) {
                logger_1.logger.error('Error extracting entities', {
                    extractorType: extractor.type,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        entities.push(...this.extractBasicEntities(message));
        return entities;
    }
    extractBasicEntities(message) {
        const entities = [];
        const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const emailMatches = message.match(emailPattern);
        if (emailMatches) {
            for (const email of emailMatches) {
                entities.push({
                    type: 'email',
                    value: email,
                    confidence: 0.95
                });
            }
        }
        const phonePattern = /\b(?:\+237|237)?[\s]?[62][0-9]{8}\b/g;
        const phoneMatches = message.match(phonePattern);
        if (phoneMatches) {
            for (const phone of phoneMatches) {
                entities.push({
                    type: 'phone_number',
                    value: phone.trim(),
                    confidence: 0.9
                });
            }
        }
        const amountPattern = /\b(\d+[\s,.]?\d*)\s*(FCFA|XAF|francs?|F\s*CFA)\b/gi;
        const amountMatches = message.matchAll(amountPattern);
        for (const match of amountMatches) {
            entities.push({
                type: 'amount',
                value: match[1].replace(/[\s,]/g, ''),
                confidence: 0.85,
                metadata: { currency: 'XAF' }
            });
        }
        const datePattern = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g;
        const dateMatches = message.matchAll(datePattern);
        for (const match of dateMatches) {
            entities.push({
                type: 'date',
                value: match[0],
                confidence: 0.8
            });
        }
        return entities;
    }
    registerIntent(intent) {
        this.intents.set(intent.name, intent);
        logger_1.logger.debug('Intent registered', { intentName: intent.name, category: intent.category });
    }
    registerEntityExtractor(extractor) {
        this.entityExtractors.set(extractor.type, extractor);
        logger_1.logger.debug('Entity extractor registered', { type: extractor.type });
    }
    getRegisteredIntents() {
        return Array.from(this.intents.values());
    }
    getIntent(intentName) {
        return this.intents.get(intentName);
    }
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        logger_1.logger.info('IntentClassifier config updated', { config: this.config });
    }
    getConfig() {
        return { ...this.config };
    }
    normalizeMessage(message) {
        return message
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s\u00C0-\u017F]/g, '');
    }
    getCacheKey(message, context) {
        const contextKey = context?.userId ? `_${context.userId}` : '';
        return `${message}${contextKey}`;
    }
    registerDefaultIntents() {
        this.registerIntent({
            name: 'greeting',
            category: 'greeting',
            description: 'Salutation de l\'utilisateur',
            keywords: [
                ['bonjour'],
                ['salut'],
                ['bonsoir'],
                ['hello'],
                ['hi'],
                ['salam'],
                ['hey']
            ],
            patterns: [
                /^(bonjour|salut|bonsoir|hello|hi|salam|hey)[\s!.]*$/i,
                /^(assalam\s*alaykum|salam\s*alaykoum)[\s!.]*$/i
            ],
            priority: 10
        });
        this.registerIntent({
            name: 'product_inquiry',
            category: 'product_inquiry',
            description: 'Demande d\'information sur un produit',
            keywords: [
                ['info', 'produit'],
                ['information', 'assurance'],
                ['c\'est', 'quoi'],
                ['expliquer'],
                ['présenter'],
                ['détails'],
                ['renseigner']
            ],
            patterns: [
                /c'est\s+quoi\s+(le|la|l'|un|une)?\s*(\w+)/i,
                /(parlez|parler|expliquer|présenter)\s+(moi|nous)?\s+(de|sur|le|la)\s+(\w+)/i
            ],
            workflowId: 'product_inquiry',
            priority: 8
        });
        this.registerIntent({
            name: 'product_purchase',
            category: 'product_purchase',
            description: 'Souscription à un produit',
            keywords: [
                ['acheter'],
                ['souscrire'],
                ['commander'],
                ['prendre', 'assurance'],
                ['je', 'veux'],
                ['intéressé']
            ],
            patterns: [
                /(je\s+veux|j'aimerais|je\s+souhaite)\s+(acheter|souscrire|prendre)/i,
                /(acheter|souscrire|commander)\s+(un|une|le|la|l')?\s*(\w+)/i
            ],
            workflowId: 'product_purchase',
            priority: 9
        });
        this.registerIntent({
            name: 'complaint',
            category: 'complaint',
            description: 'Réclamation ou problème',
            keywords: [
                ['réclamation'],
                ['plainte'],
                ['problème'],
                ['pas', 'content'],
                ['insatisfait'],
                ['erreur'],
                ['bug']
            ],
            patterns: [
                /(j'ai|il\s+y\s+a)\s+un\s+(problème|bug|erreur)/i,
                /(pas|pas\s+du\s+tout|très)\s+(content|satisfait)/i
            ],
            workflowId: 'complaint_handling',
            priority: 9
        });
        this.registerIntent({
            name: 'support',
            category: 'support',
            description: 'Demande d\'aide ou support',
            keywords: [
                ['aide'],
                ['aidez', 'moi'],
                ['besoin', 'aide'],
                ['comment'],
                ['pourquoi'],
                ['question']
            ],
            patterns: [
                /(j'ai\s+besoin\s+d'|besoin\s+de)\s*aide/i,
                /comment\s+(faire|puis-je|je\s+peux)/i
            ],
            priority: 7
        });
        this.registerIntent({
            name: 'contact_info',
            category: 'support',
            description: 'Demande d\'informations de contact',
            keywords: [
                ['contact'],
                ['contacter'],
                ['joindre'],
                ['téléphone'],
                ['email'],
                ['adresse'],
                ['bureau']
            ],
            patterns: [
                /(comment|où|quel)\s+(vous\s+)?(contacter|joindre)/i,
                /(numéro|téléphone|email|adresse)\s+(de\s+)?(contact|bureau)/i
            ],
            priority: 7
        });
        this.registerIntent({
            name: 'pricing_inquiry',
            category: 'product_inquiry',
            description: 'Demande de tarification',
            keywords: [
                ['prix'],
                ['tarif'],
                ['coût'],
                ['combien'],
                ['montant'],
                ['payer']
            ],
            patterns: [
                /(quel|c'est|combien)\s+(est\s+)?(le\s+)?(prix|tarif|coût)/i,
                /combien\s+(ça\s+)?coûte/i,
                /(je\s+dois|il\s+faut)\s+payer\s+combien/i
            ],
            workflowId: 'pricing_inquiry',
            priority: 8
        });
        this.registerIntent({
            name: 'cancellation',
            category: 'cancellation',
            description: 'Annulation ou arrêt',
            keywords: [
                ['annuler'],
                ['annulation'],
                ['arrêter'],
                ['stop'],
                ['résilier'],
                ['résiliation']
            ],
            patterns: [
                /(je\s+veux|j'aimerais)\s+(annuler|arrêter|résilier)/i,
                /(annulation|résiliation)\s+(de|du)/i
            ],
            priority: 9
        });
        logger_1.logger.info('Default intents registered', { count: this.intents.size });
    }
}
exports.IntentClassifier = IntentClassifier;
//# sourceMappingURL=intentClassifier.js.map