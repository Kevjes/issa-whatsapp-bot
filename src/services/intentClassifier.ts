/**
 * Classificateur d'intentions
 * Architecture: Application Layer (Clean Architecture)
 */

import { IIntentClassifier } from '../core/interfaces/IIntentClassifier';
import {
  Intent,
  IntentDefinition,
  IntentClassificationResult,
  IntentClassifierConfig,
  ClassificationContext,
  EntityExtractor,
  Entity,
  ClassificationMethod
} from '../types/intent';
import { logger } from '../utils/logger';

export class IntentClassifier implements IIntentClassifier {
  private intents: Map<string, IntentDefinition> = new Map();
  private entityExtractors: Map<string, EntityExtractor> = new Map();
  private config: IntentClassifierConfig;
  private cache: Map<string, IntentClassificationResult> = new Map();

  constructor(config?: Partial<IntentClassifierConfig>) {
    this.config = {
      confidenceThreshold: config?.confidenceThreshold || 0.6,
      maxAlternatives: config?.maxAlternatives || 3,
      useAI: config?.useAI !== undefined ? config.useAI : false,
      useCaching: config?.useCaching !== undefined ? config.useCaching : true,
      fallbackIntent: config?.fallbackIntent || 'unknown',
      enableEntityExtraction: config?.enableEntityExtraction !== undefined ? config.enableEntityExtraction : true
    };

    logger.info('IntentClassifier initialized', { config: this.config });

    // Enregistrer les intentions par défaut
    this.registerDefaultIntents();
  }

  /**
   * Classifier l'intention d'un message
   */
  async classifyIntent(
    message: string,
    context?: ClassificationContext
  ): Promise<IntentClassificationResult> {
    const startTime = Date.now();

    try {
      // Normaliser le message
      const normalizedMessage = this.normalizeMessage(message);

      // Vérifier le cache
      if (this.config.useCaching) {
        const cacheKey = this.getCacheKey(normalizedMessage, context);
        const cached = this.cache.get(cacheKey);
        if (cached) {
          logger.debug('Intent classification from cache', { message: normalizedMessage });
          return cached;
        }
      }

      // 1. Détection par mots-clés (rapide)
      const keywordIntent = await this.classifyByKeywords(normalizedMessage);

      // 2. Détection par patterns regex
      const patternIntent = await this.classifyByPatterns(normalizedMessage);

      // 3. Choisir la meilleure intention
      let primaryIntent: Intent;
      let method: ClassificationMethod;
      const alternativeIntents: Intent[] = [];

      // Comparer les confiances
      if (keywordIntent && patternIntent) {
        if (keywordIntent.confidence >= patternIntent.confidence) {
          primaryIntent = keywordIntent;
          alternativeIntents.push(patternIntent);
          method = 'keyword';
        } else {
          primaryIntent = patternIntent;
          alternativeIntents.push(keywordIntent);
          method = 'pattern';
        }
      } else if (keywordIntent) {
        primaryIntent = keywordIntent;
        method = 'keyword';
      } else if (patternIntent) {
        primaryIntent = patternIntent;
        method = 'pattern';
      } else {
        // Fallback: intention inconnue
        primaryIntent = {
          name: this.config.fallbackIntent,
          confidence: 0.3,
          category: 'unknown'
        };
        method = 'keyword';
      }

      // 4. Si confiance faible et AI activée, utiliser l'IA
      if (this.config.useAI && primaryIntent.confidence < this.config.confidenceThreshold) {
        // TODO: Implémenter classification par IA
        // const aiIntent = await this.classifyByAI(normalizedMessage, context);
        // if (aiIntent.confidence > primaryIntent.confidence) {
        //   primaryIntent = aiIntent;
        //   method = 'ai';
        // }
      }

      // 5. Extraire les entités si activé
      let entities: Entity[] = [];
      if (this.config.enableEntityExtraction) {
        entities = await this.extractEntities(normalizedMessage, context);
      }

      // Ajouter les entités à l'intention primaire
      primaryIntent.entities = entities;

      const processingTime = Date.now() - startTime;

      const result: IntentClassificationResult = {
        primaryIntent,
        alternativeIntents: alternativeIntents.slice(0, this.config.maxAlternatives),
        entities,
        confidence: primaryIntent.confidence,
        method,
        processingTime
      };

      // Mettre en cache
      if (this.config.useCaching) {
        const cacheKey = this.getCacheKey(normalizedMessage, context);
        this.cache.set(cacheKey, result);
      }

      logger.info('Intent classified', {
        message: normalizedMessage.substring(0, 50),
        intent: primaryIntent.name,
        confidence: primaryIntent.confidence,
        method,
        processingTime
      });

      return result;

    } catch (error) {
      logger.error('Error classifying intent', {
        message,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Retourner intention fallback
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

  /**
   * Classification par mots-clés
   */
  private async classifyByKeywords(message: string): Promise<Intent | null> {
    const lowerMessage = message.toLowerCase();
    let bestIntent: Intent | null = null;
    let bestScore = 0;

    for (const intentDef of this.intents.values()) {
      let score = 0;
      let matchedKeywords = 0;

      // Vérifier chaque groupe de mots-clés (OR entre groupes)
      for (const keywordGroup of intentDef.keywords) {
        let groupMatched = true;

        // AND dans le groupe
        for (const keyword of keywordGroup) {
          if (!lowerMessage.includes(keyword.toLowerCase())) {
            groupMatched = false;
            break;
          }
        }

        if (groupMatched) {
          matchedKeywords += keywordGroup.length;
          score += keywordGroup.length * 0.2; // Poids par mot-clé
        }
      }

      // Bonus pour correspondance exacte
      if (intentDef.examples) {
        for (const example of intentDef.examples) {
          if (lowerMessage === example.toLowerCase()) {
            score += 0.5;
            break;
          }
        }
      }

      // Appliquer la priorité
      if (intentDef.priority) {
        score *= (1 + intentDef.priority * 0.1);
      }

      // Normaliser le score (max 1.0)
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

  /**
   * Classification par patterns regex
   */
  private async classifyByPatterns(message: string): Promise<Intent | null> {
    let bestIntent: Intent | null = null;
    let bestScore = 0;

    for (const intentDef of this.intents.values()) {
      if (!intentDef.patterns || intentDef.patterns.length === 0) {
        continue;
      }

      for (const pattern of intentDef.patterns) {
        const match = message.match(pattern);
        if (match) {
          // Score basé sur la longueur de la correspondance
          const matchLength = match[0].length;
          const score = Math.min(matchLength / message.length, 0.9);

          // Appliquer la priorité
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

  /**
   * Extraire les entités du message
   */
  private async extractEntities(
    message: string,
    context?: ClassificationContext
  ): Promise<Entity[]> {
    const entities: Entity[] = [];

    // Extraire avec chaque extracteur enregistré
    for (const extractor of this.entityExtractors.values()) {
      try {
        const extracted = await extractor.extract(message, context);
        entities.push(...extracted);
      } catch (error) {
        logger.error('Error extracting entities', {
          extractorType: extractor.type,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Extraire entités basiques (patterns)
    entities.push(...this.extractBasicEntities(message));

    return entities;
  }

  /**
   * Extraire entités basiques avec patterns
   */
  private extractBasicEntities(message: string): Entity[] {
    const entities: Entity[] = [];

    // Email
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

    // Numéro de téléphone (format camerounais)
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

    // Montant (avec FCFA, XAF, etc.)
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

    // Date (format basique)
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

  /**
   * Enregistrer une définition d'intention
   */
  registerIntent(intent: IntentDefinition): void {
    this.intents.set(intent.name, intent);
    logger.debug('Intent registered', { intentName: intent.name, category: intent.category });
  }

  /**
   * Enregistrer un extracteur d'entités
   */
  registerEntityExtractor(extractor: EntityExtractor): void {
    this.entityExtractors.set(extractor.type, extractor);
    logger.debug('Entity extractor registered', { type: extractor.type });
  }

  /**
   * Obtenir toutes les intentions enregistrées
   */
  getRegisteredIntents(): IntentDefinition[] {
    return Array.from(this.intents.values());
  }

  /**
   * Obtenir une intention par son nom
   */
  getIntent(intentName: string): IntentDefinition | undefined {
    return this.intents.get(intentName);
  }

  /**
   * Mettre à jour la configuration
   */
  updateConfig(config: Partial<IntentClassifierConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('IntentClassifier config updated', { config: this.config });
  }

  /**
   * Obtenir la configuration actuelle
   */
  getConfig(): IntentClassifierConfig {
    return { ...this.config };
  }

  /**
   * Normaliser un message
   */
  private normalizeMessage(message: string): string {
    return message
      .trim()
      .replace(/\s+/g, ' ') // Remplacer espaces multiples par un seul
      .replace(/[^\w\s\u00C0-\u017F]/g, ''); // Garder lettres, chiffres, espaces et accents
  }

  /**
   * Générer une clé de cache
   */
  private getCacheKey(message: string, context?: ClassificationContext): string {
    const contextKey = context?.userId ? `_${context.userId}` : '';
    return `${message}${contextKey}`;
  }

  /**
   * Enregistrer les intentions par défaut
   */
  private registerDefaultIntents(): void {
    // Intention: Salutation
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

    // Intention: Demande d'information produit
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

    // Intention: Achat/Souscription
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

    // Intention: Réclamation
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

    // Intention: Support/Aide
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

    // Intention: Contact
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

    // Intention: Tarification
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

    // Intention: Annulation
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

    logger.info('Default intents registered', { count: this.intents.size });
  }
}
