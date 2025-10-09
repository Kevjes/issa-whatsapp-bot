/**
 * Service de recherche de connaissances optimisé et intelligent
 * Architecture: Application Layer (Clean Architecture)
 */

import { DatabaseService } from './databaseService';
import {
  KnowledgeEntry,
  KnowledgeSearchQuery,
  KnowledgeSearchResult,
  ScoredKnowledgeEntry,
  SearchMethod,
  KnowledgeSearchConfig,
  AIKnowledgeContext,
  KnowledgeCategory
} from '../types/knowledge';
import { Intent } from '../types/intent';
import { logger } from '../utils/logger';
import NodeCache from 'node-cache';

export class EnhancedKnowledgeService {
  private databaseService: DatabaseService;
  private cache: NodeCache;
  private config: KnowledgeSearchConfig;

  // Mapping intention -> catégories pertinentes
  private readonly intentToCategoryMap: Map<string, KnowledgeCategory[]> = new Map([
    ['product_inquiry', ['roi_products', 'takaful_products', 'faq']],
    ['product_purchase', ['roi_products', 'takaful_products', 'pricing']],
    ['pricing_inquiry', ['pricing', 'roi_products', 'takaful_products']],
    ['complaint', ['claims', 'contact', 'faq']],
    ['support', ['contact', 'faq', 'roi_general']],
    ['contact_info', ['contact', 'roi_general']],
    ['cancellation', ['legal', 'claims', 'contact']],
    ['greeting', ['roi_general', 'takaful_general']],
    ['general_question', ['faq', 'roi_general', 'takaful_general']]
  ]);

  // Poids des catégories selon le contexte
  private readonly categoryWeights: Map<KnowledgeCategory, number> = new Map([
    ['takaful_principles', 1.2],
    ['takaful_products', 1.2],
    ['roi_products', 1.1],
    ['pricing', 1.1],
    ['faq', 1.0],
    ['roi_general', 0.9],
    ['contact', 0.8]
  ]);

  constructor(databaseService: DatabaseService, config?: Partial<KnowledgeSearchConfig>) {
    this.databaseService = databaseService;

    this.config = {
      strategies: config?.strategies || [
        { name: 'keyword', method: 'keyword', weight: 0.4, enabled: true },
        { name: 'fuzzy', method: 'fuzzy', weight: 0.3, enabled: true },
        { name: 'intent_based', method: 'intent_based', weight: 0.3, enabled: true }
      ],
      defaultMaxResults: config?.defaultMaxResults || 5,
      defaultMinRelevance: config?.defaultMinRelevance || 0.3,
      enableCaching: config?.enableCaching !== undefined ? config.enableCaching : true,
      cacheExpiration: config?.cacheExpiration || 3600,
      enableLogging: config?.enableLogging !== undefined ? config.enableLogging : true,
      fuzzyMatchThreshold: config?.fuzzyMatchThreshold || 0.7
    };

    this.cache = new NodeCache({
      stdTTL: this.config.cacheExpiration,
      checkperiod: 600,
      useClones: false,
      maxKeys: 1000
    });

    logger.info('EnhancedKnowledgeService initialized', { config: this.config });
  }

  /**
   * Recherche intelligente basée sur l'intention
   */
  async searchByIntent(
    query: string,
    intent?: Intent,
    maxResults: number = 5
  ): Promise<KnowledgeSearchResult> {
    const startTime = Date.now();

    try {
      // Construire la requête de recherche
      const searchQuery: KnowledgeSearchQuery = {
        text: query,
        intent: intent?.name,
        category: this.getCategoryFromIntent(intent),
        entities: intent?.entities?.map(e => ({ type: e.type, value: e.value })),
        maxResults,
        minRelevance: this.config.defaultMinRelevance
      };

      // Vérifier le cache
      if (this.config.enableCaching) {
        const cacheKey = this.getCacheKey(searchQuery);
        const cached = this.cache.get<KnowledgeSearchResult>(cacheKey);
        if (cached) {
          if (this.config.enableLogging) {
            logger.debug('Knowledge search from cache', { query: query.substring(0, 50) });
          }
          return cached;
        }
      }

      // Recherche multi-stratégies
      const results = await this.hybridSearch(searchQuery);

      const processingTime = Date.now() - startTime;

      const searchResult: KnowledgeSearchResult = {
        entries: results.slice(0, maxResults),
        totalFound: results.length,
        query: searchQuery,
        searchMethod: 'hybrid',
        processingTime
      };

      // Mettre en cache
      if (this.config.enableCaching) {
        const cacheKey = this.getCacheKey(searchQuery);
        this.cache.set(cacheKey, searchResult);
      }

      if (this.config.enableLogging) {
        logger.info('Knowledge search completed', {
          query: query.substring(0, 50),
          intent: intent?.name,
          resultsFound: results.length,
          topScore: results[0]?.relevanceScore,
          processingTime
        });
      }

      return searchResult;

    } catch (error) {
      logger.error('Error in knowledge search', {
        query,
        intent: intent?.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        entries: [],
        totalFound: 0,
        query: { text: query, intent: intent?.name },
        searchMethod: 'hybrid',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Recherche hybride combinant plusieurs stratégies
   */
  private async hybridSearch(query: KnowledgeSearchQuery): Promise<ScoredKnowledgeEntry[]> {
    const allResults: Map<number, ScoredKnowledgeEntry> = new Map();

    // 1. Recherche par mots-clés
    if (this.isStrategyEnabled('keyword')) {
      const keywordResults = await this.keywordSearch(query);
      this.mergeResults(allResults, keywordResults, this.getStrategyWeight('keyword'));
    }

    // 2. Recherche floue
    if (this.isStrategyEnabled('fuzzy')) {
      const fuzzyResults = await this.fuzzySearch(query);
      this.mergeResults(allResults, fuzzyResults, this.getStrategyWeight('fuzzy'));
    }

    // 3. Recherche basée sur l'intention
    if (this.isStrategyEnabled('intent_based') && query.intent) {
      const intentResults = await this.intentBasedSearch(query);
      this.mergeResults(allResults, intentResults, this.getStrategyWeight('intent_based'));
    }

    // Trier par score de pertinence
    const sortedResults = Array.from(allResults.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .filter(r => r.relevanceScore >= (query.minRelevance || this.config.defaultMinRelevance));

    return sortedResults;
  }

  /**
   * Recherche par mots-clés
   */
  private async keywordSearch(query: KnowledgeSearchQuery): Promise<ScoredKnowledgeEntry[]> {
    try {
      // Extraire les mots-clés du texte
      const keywords = this.extractKeywords(query.text);

      // Rechercher dans la base
      const entries = await this.databaseService.searchKnowledgeBase(keywords.join(' '));

      // Scorer les résultats
      return entries.map(entry => this.scoreEntry(entry, keywords, query));

    } catch (error) {
      logger.error('Error in keyword search', { error });
      return [];
    }
  }

  /**
   * Recherche floue (fuzzy matching)
   */
  private async fuzzySearch(query: KnowledgeSearchQuery): Promise<ScoredKnowledgeEntry[]> {
    try {
      // Obtenir toutes les entrées de la catégorie si spécifiée
      const allEntries = query.category
        ? await this.databaseService.getKnowledgeByCategory(query.category)
        : await this.databaseService.getAllKnowledgeEntries();

      const keywords = this.extractKeywords(query.text);

      // Appliquer fuzzy matching
      const scoredEntries = allEntries
        .map(entry => {
          const fuzzyScore = this.calculateFuzzyScore(keywords, entry);
          return {
            ...entry,
            relevanceScore: fuzzyScore,
            matchedKeywords: keywords,
            reason: 'fuzzy_match'
          } as ScoredKnowledgeEntry;
        })
        .filter(entry => entry.relevanceScore >= this.config.fuzzyMatchThreshold);

      return scoredEntries;

    } catch (error) {
      logger.error('Error in fuzzy search', { error });
      return [];
    }
  }

  /**
   * Recherche basée sur l'intention
   */
  private async intentBasedSearch(query: KnowledgeSearchQuery): Promise<ScoredKnowledgeEntry[]> {
    try {
      if (!query.intent) {
        return [];
      }

      // Obtenir les catégories pertinentes pour cette intention
      const relevantCategories = this.intentToCategoryMap.get(query.intent) || [];

      const results: ScoredKnowledgeEntry[] = [];

      // Rechercher dans chaque catégorie pertinente
      for (const category of relevantCategories) {
        const entries = await this.databaseService.getKnowledgeByCategory(category);

        const keywords = this.extractKeywords(query.text);

        for (const entry of entries) {
          const score = this.scoreEntry(entry, keywords, query);
          const categoryBonus = this.categoryWeights.get(category as KnowledgeCategory) || 1.0;

          results.push({
            ...entry,
            relevanceScore: score.relevanceScore * categoryBonus,
            matchedKeywords: score.matchedKeywords,
            reason: `intent_based:${query.intent}`
          } as ScoredKnowledgeEntry);
        }
      }

      return results;

    } catch (error) {
      logger.error('Error in intent-based search', { error });
      return [];
    }
  }

  /**
   * Scorer une entrée de connaissance
   */
  private scoreEntry(
    entry: KnowledgeEntry,
    keywords: string[],
    query: KnowledgeSearchQuery
  ): ScoredKnowledgeEntry {
    let score = 0;
    const matchedKeywords: string[] = [];

    // Normaliser pour comparaison
    const titleLower = entry.title.toLowerCase();
    const contentLower = entry.content.toLowerCase();
    const entryKeywords = entry.keywords.map(k => k.toLowerCase());

    // Score basé sur les mots-clés
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();

      // Titre (poids 0.3)
      if (titleLower.includes(keywordLower)) {
        score += 0.3;
        matchedKeywords.push(keyword);
      }

      // Mots-clés de l'entrée (poids 0.25)
      if (entryKeywords.some(k => k.includes(keywordLower))) {
        score += 0.25;
        if (!matchedKeywords.includes(keyword)) {
          matchedKeywords.push(keyword);
        }
      }

      // Contenu (poids 0.15)
      if (contentLower.includes(keywordLower)) {
        score += 0.15;
        if (!matchedKeywords.includes(keyword)) {
          matchedKeywords.push(keyword);
        }
      }
    }

    // Bonus pour catégorie correspondante
    if (query.category && entry.category === query.category) {
      score += 0.2;
    }

    // Bonus pour entités détectées
    if (query.entities && query.entities.length > 0) {
      for (const entity of query.entities) {
        if (contentLower.includes(entity.value.toLowerCase())) {
          score += 0.1;
        }
      }
    }

    // Appliquer priorité de l'entrée si elle existe
    if (entry.priority) {
      score *= (1 + entry.priority * 0.1);
    }

    // Normaliser le score (max 1.0)
    const normalizedScore = Math.min(score, 1.0);

    return {
      ...entry,
      relevanceScore: normalizedScore,
      matchedKeywords,
      reason: 'keyword_match'
    };
  }

  /**
   * Calculer le score de fuzzy matching
   */
  private calculateFuzzyScore(keywords: string[], entry: KnowledgeEntry): number {
    const text = `${entry.title} ${entry.content} ${entry.keywords.join(' ')}`.toLowerCase();
    let matchCount = 0;
    let totalChars = 0;

    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      totalChars += keywordLower.length;

      // Fuzzy match simple: vérifier la distance de Levenshtein approximative
      if (text.includes(keywordLower)) {
        matchCount += keywordLower.length;
      } else {
        // Chercher des correspondances partielles
        for (let i = 0; i < text.length - keywordLower.length + 1; i++) {
          const substring = text.substring(i, i + keywordLower.length);
          const similarity = this.stringSimilarity(keywordLower, substring);
          if (similarity > this.config.fuzzyMatchThreshold) {
            matchCount += keywordLower.length * similarity;
            break;
          }
        }
      }
    }

    return totalChars > 0 ? matchCount / totalChars : 0;
  }

  /**
   * Calculer la similarité entre deux chaînes
   */
  private stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Distance de Levenshtein
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Fusionner les résultats avec pondération
   */
  private mergeResults(
    target: Map<number, ScoredKnowledgeEntry>,
    source: ScoredKnowledgeEntry[],
    weight: number
  ): void {
    for (const entry of source) {
      const id = entry.id!;
      const existing = target.get(id);

      if (existing) {
        // Combiner les scores
        existing.relevanceScore += entry.relevanceScore * weight;

        // Fusionner les mots-clés correspondants
        existing.matchedKeywords = Array.from(
          new Set([...existing.matchedKeywords, ...entry.matchedKeywords])
        );
      } else {
        // Ajouter avec score pondéré
        target.set(id, {
          ...entry,
          relevanceScore: entry.relevanceScore * weight
        });
      }
    }
  }

  /**
   * Extraire les mots-clés d'un texte
   */
  private extractKeywords(text: string): string[] {
    // Mots vides français à ignorer (stop words)
    const stopWords = new Set([
      // Articles
      'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'mais',
      // Prépositions
      'pour', 'sur', 'dans', 'avec', 'sans', 'par', 'chez', 'vers', 'sous',
      // Verbes courants
      'est', 'sont', 'être', 'avoir', 'fait', 'faire', 'dire', 'peut', 'veut',
      'parle', 'parler', 'explique', 'expliquer', 'donne', 'donner', 'dis', 'dit',
      // Pronoms
      'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'me', 'te', 'se',
      'moi', 'toi', 'lui', 'leur', 'mon', 'ton', 'son', 'ma', 'ta', 'sa',
      'mes', 'tes', 'ses', 'notre', 'votre', 'nos', 'vos', 'leurs',
      // Déterminants
      'ce', 'cet', 'cette', 'ces', 'quel', 'quelle', 'quels', 'quelles',
      // Mots interrogatifs et conjonctions
      'que', 'qui', 'quoi', 'dont', 'où', 'comment', 'pourquoi', 'quand',
      'car', 'donc', 'or', 'ni', 'puis', 'alors', 'ainsi', 'aussi', 'encore',
      // Locutions courantes
      'plus', 'moins', 'très', 'tout', 'tous', 'toute', 'toutes', 'même', 'autre',
      'bien', 'encore', 'déjà', 'jamais', 'toujours', 'souvent', 'parfois',
      // Connecteurs et formules de politesse
      'voici', 'voilà', 's\'il', 'sil', 'merci', 'bonjour', 'bonsoir', 'salut',
      'svp', 'stp', 'peux', 'pouvez', 'pourrait', 'veux', 'voudrais'
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s\u00C0-\u017F]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Limiter à 10 mots-clés
  }

  /**
   * Obtenir la catégorie depuis l'intention
   */
  private getCategoryFromIntent(intent?: Intent): KnowledgeCategory | undefined {
    if (!intent) return undefined;

    const categories = this.intentToCategoryMap.get(intent.name);
    return categories ? categories[0] : undefined;
  }

  /**
   * Vérifier si une stratégie est activée
   */
  private isStrategyEnabled(method: SearchMethod): boolean {
    const strategy = this.config.strategies.find(s => s.method === method);
    return strategy?.enabled || false;
  }

  /**
   * Obtenir le poids d'une stratégie
   */
  private getStrategyWeight(method: SearchMethod): number {
    const strategy = this.config.strategies.find(s => s.method === method);
    return strategy?.weight || 1.0;
  }

  /**
   * Générer une clé de cache
   */
  private getCacheKey(query: KnowledgeSearchQuery): string {
    return `${query.text}_${query.intent || ''}_${query.category || ''}`;
  }

  /**
   * Formater le contexte pour l'IA
   */
  async formatContextForAI(
    searchResult: KnowledgeSearchResult,
    maxEntries: number = 3
  ): Promise<AIKnowledgeContext> {
    const relevantEntries = searchResult.entries.slice(0, maxEntries);

    // Formater le contexte de manière structurée pour l'IA
    const formattedContext = relevantEntries
      .map((entry, index) => {
        return `[Source ${index + 1}: ${entry.title}]
${entry.content}

Mots-clés: ${entry.keywords.join(', ')}
Pertinence: ${(entry.relevanceScore * 100).toFixed(0)}%
---`;
      })
      .join('\n\n');

    return {
      relevantEntries,
      searchQuery: searchResult.query.text,
      intent: searchResult.query.intent,
      category: searchResult.query.category,
      formattedContext
    };
  }

  /**
   * Obtenir des statistiques de cache
   */
  getCacheStats() {
    return {
      keys: this.cache.keys().length,
      hits: this.cache.getStats().hits,
      misses: this.cache.getStats().misses,
      hitRate: this.cache.getStats().hits / (this.cache.getStats().hits + this.cache.getStats().misses)
    };
  }

  /**
   * Vider le cache
   */
  clearCache(): void {
    this.cache.flushAll();
    logger.info('Knowledge cache cleared');
  }
}
