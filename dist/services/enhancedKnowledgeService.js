"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedKnowledgeService = void 0;
const logger_1 = require("../utils/logger");
const node_cache_1 = __importDefault(require("node-cache"));
class EnhancedKnowledgeService {
    constructor(databaseService, vectorSearchService, config) {
        this.intentToCategoryMap = new Map([
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
        this.categoryWeights = new Map([
            ['takaful_principles', 1.2],
            ['takaful_products', 1.2],
            ['roi_products', 1.1],
            ['pricing', 1.1],
            ['faq', 1.0],
            ['roi_general', 0.9],
            ['contact', 0.8]
        ]);
        this.databaseService = databaseService;
        this.vectorSearchService = vectorSearchService;
        this.config = {
            strategies: config?.strategies || [
                { name: 'keyword', method: 'keyword', weight: 0.3, enabled: true },
                { name: 'fuzzy', method: 'fuzzy', weight: 0.2, enabled: true },
                { name: 'intent_based', method: 'intent_based', weight: 0.2, enabled: true },
                { name: 'semantic', method: 'semantic', weight: 0.3, enabled: true }
            ],
            defaultMaxResults: config?.defaultMaxResults || 5,
            defaultMinRelevance: config?.defaultMinRelevance || 0.2,
            enableCaching: config?.enableCaching !== undefined ? config.enableCaching : true,
            cacheExpiration: config?.cacheExpiration || 3600,
            enableLogging: config?.enableLogging !== undefined ? config.enableLogging : true,
            fuzzyMatchThreshold: config?.fuzzyMatchThreshold || 0.7
        };
        this.cache = new node_cache_1.default({
            stdTTL: this.config.cacheExpiration,
            checkperiod: 600,
            useClones: false,
            maxKeys: 1000
        });
        logger_1.logger.info('EnhancedKnowledgeService initialized', { config: this.config });
    }
    async searchByIntent(query, intent, maxResults = 5) {
        const startTime = Date.now();
        try {
            const searchQuery = {
                text: query,
                intent: intent?.name,
                category: this.getCategoryFromIntent(intent),
                entities: intent?.entities?.map(e => ({ type: e.type, value: e.value })),
                maxResults,
                minRelevance: this.config.defaultMinRelevance
            };
            if (this.config.enableCaching) {
                const cacheKey = this.getCacheKey(searchQuery);
                const cached = this.cache.get(cacheKey);
                if (cached) {
                    if (this.config.enableLogging) {
                        logger_1.logger.debug('Knowledge search from cache', { query: query.substring(0, 50) });
                    }
                    return cached;
                }
            }
            const results = await this.hybridSearch(searchQuery);
            const processingTime = Date.now() - startTime;
            const searchResult = {
                entries: results.slice(0, maxResults),
                totalFound: results.length,
                query: searchQuery,
                searchMethod: 'hybrid',
                processingTime
            };
            if (this.config.enableCaching) {
                const cacheKey = this.getCacheKey(searchQuery);
                this.cache.set(cacheKey, searchResult);
            }
            if (this.config.enableLogging) {
                logger_1.logger.info('Knowledge search completed', {
                    query: query.substring(0, 50),
                    intent: intent?.name,
                    resultsFound: results.length,
                    topScore: results[0]?.relevanceScore,
                    processingTime
                });
            }
            return searchResult;
        }
        catch (error) {
            logger_1.logger.error('Error in knowledge search', {
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
    async hybridSearch(query) {
        const allResults = new Map();
        if (this.isStrategyEnabled('keyword')) {
            const keywordResults = await this.keywordSearch(query);
            this.mergeResults(allResults, keywordResults, this.getStrategyWeight('keyword'));
        }
        if (this.isStrategyEnabled('fuzzy')) {
            const fuzzyResults = await this.fuzzySearch(query);
            this.mergeResults(allResults, fuzzyResults, this.getStrategyWeight('fuzzy'));
        }
        if (this.isStrategyEnabled('intent_based') && query.intent) {
            const intentResults = await this.intentBasedSearch(query);
            this.mergeResults(allResults, intentResults, this.getStrategyWeight('intent_based'));
        }
        if (this.isStrategyEnabled('semantic')) {
            const semanticResults = await this.semanticSearch(query);
            this.mergeResults(allResults, semanticResults, this.getStrategyWeight('semantic'));
        }
        const sortedResults = Array.from(allResults.values())
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .filter(r => r.relevanceScore >= (query.minRelevance || this.config.defaultMinRelevance));
        return sortedResults;
    }
    async keywordSearch(query) {
        try {
            const keywords = this.extractKeywords(query.text);
            const entries = await this.databaseService.searchKnowledgeBase(keywords.join(' '));
            return entries.map(entry => this.scoreEntry(entry, keywords, query));
        }
        catch (error) {
            logger_1.logger.error('Error in keyword search', { error });
            return [];
        }
    }
    async fuzzySearch(query) {
        try {
            const allEntries = query.category
                ? await this.databaseService.getKnowledgeByCategory(query.category)
                : await this.databaseService.getAllKnowledgeEntries();
            const keywords = this.extractKeywords(query.text);
            const scoredEntries = allEntries
                .map(entry => {
                const fuzzyScore = this.calculateFuzzyScore(keywords, entry);
                return {
                    ...entry,
                    relevanceScore: fuzzyScore,
                    matchedKeywords: keywords,
                    reason: 'fuzzy_match'
                };
            })
                .filter(entry => entry.relevanceScore >= this.config.fuzzyMatchThreshold);
            return scoredEntries;
        }
        catch (error) {
            logger_1.logger.error('Error in fuzzy search', { error });
            return [];
        }
    }
    async intentBasedSearch(query) {
        try {
            if (!query.intent) {
                return [];
            }
            const relevantCategories = this.intentToCategoryMap.get(query.intent) || [];
            const results = [];
            for (const category of relevantCategories) {
                const entries = await this.databaseService.getKnowledgeByCategory(category);
                const keywords = this.extractKeywords(query.text);
                for (const entry of entries) {
                    const score = this.scoreEntry(entry, keywords, query);
                    const categoryBonus = this.categoryWeights.get(category) || 1.0;
                    results.push({
                        ...entry,
                        relevanceScore: score.relevanceScore * categoryBonus,
                        matchedKeywords: score.matchedKeywords,
                        reason: `intent_based:${query.intent}`
                    });
                }
            }
            return results;
        }
        catch (error) {
            logger_1.logger.error('Error in intent-based search', { error });
            return [];
        }
    }
    async semanticSearch(query) {
        try {
            const queryEmbedding = await this.vectorSearchService.generateEmbedding(query.text);
            const allEmbeddings = await this.databaseService.getAllEmbeddings();
            if (allEmbeddings.length === 0) {
                logger_1.logger.warn('No embeddings found in database');
                return [];
            }
            const similarities = [];
            for (const { knowledgeId, embedding } of allEmbeddings) {
                const similarity = this.vectorSearchService.cosineSimilarity(queryEmbedding, embedding);
                similarities.push({ knowledgeId, similarity });
            }
            similarities.sort((a, b) => b.similarity - a.similarity);
            const results = [];
            const topSimilarities = similarities.slice(0, query.maxResults || 10);
            const allEntries = await this.databaseService.getAllKnowledgeEntries();
            const entriesMap = new Map(allEntries.map(e => [e.id, e]));
            for (const { knowledgeId, similarity } of topSimilarities) {
                if (similarity < 0.2)
                    continue;
                const entry = entriesMap.get(knowledgeId);
                if (entry) {
                    results.push({
                        ...entry,
                        relevanceScore: similarity,
                        matchedKeywords: this.extractKeywords(query.text),
                        reason: 'semantic_similarity'
                    });
                }
            }
            if (this.config.enableLogging) {
                logger_1.logger.debug('Semantic search completed', {
                    query: query.text.substring(0, 50),
                    resultsFound: results.length,
                    topSimilarity: similarities[0]?.similarity
                });
            }
            return results;
        }
        catch (error) {
            logger_1.logger.error('Error in semantic search', { error });
            return [];
        }
    }
    scoreEntry(entry, keywords, query) {
        let score = 0;
        const matchedKeywords = [];
        const titleLower = entry.title.toLowerCase();
        const contentLower = entry.content.toLowerCase();
        const entryKeywords = entry.keywords.map(k => k.toLowerCase());
        for (const keyword of keywords) {
            const keywordLower = keyword.toLowerCase();
            if (titleLower.includes(keywordLower)) {
                score += 0.3;
                matchedKeywords.push(keyword);
            }
            if (entryKeywords.some(k => k.includes(keywordLower))) {
                score += 0.25;
                if (!matchedKeywords.includes(keyword)) {
                    matchedKeywords.push(keyword);
                }
            }
            if (contentLower.includes(keywordLower)) {
                score += 0.15;
                if (!matchedKeywords.includes(keyword)) {
                    matchedKeywords.push(keyword);
                }
            }
        }
        if (query.category && entry.category === query.category) {
            score += 0.2;
        }
        if (query.entities && query.entities.length > 0) {
            for (const entity of query.entities) {
                if (contentLower.includes(entity.value.toLowerCase())) {
                    score += 0.1;
                }
            }
        }
        if (entry.priority) {
            score *= (1 + entry.priority * 0.1);
        }
        const normalizedScore = Math.min(score, 1.0);
        return {
            ...entry,
            relevanceScore: normalizedScore,
            matchedKeywords,
            reason: 'keyword_match'
        };
    }
    calculateFuzzyScore(keywords, entry) {
        const text = `${entry.title} ${entry.content} ${entry.keywords.join(' ')}`.toLowerCase();
        let matchCount = 0;
        let totalChars = 0;
        for (const keyword of keywords) {
            const keywordLower = keyword.toLowerCase();
            totalChars += keywordLower.length;
            if (text.includes(keywordLower)) {
                matchCount += keywordLower.length;
            }
            else {
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
    stringSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        if (longer.length === 0) {
            return 1.0;
        }
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    levenshteinDistance(str1, str2) {
        const matrix = [];
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
                }
                else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
                }
            }
        }
        return matrix[str2.length][str1.length];
    }
    mergeResults(target, source, weight) {
        for (const entry of source) {
            const id = entry.id;
            const existing = target.get(id);
            if (existing) {
                existing.relevanceScore += entry.relevanceScore * weight;
                existing.matchedKeywords = Array.from(new Set([...existing.matchedKeywords, ...entry.matchedKeywords]));
            }
            else {
                target.set(id, {
                    ...entry,
                    relevanceScore: entry.relevanceScore * weight
                });
            }
        }
    }
    extractKeywords(text) {
        const stopWords = new Set([
            'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'mais',
            'pour', 'sur', 'dans', 'avec', 'sans', 'par', 'chez', 'vers', 'sous',
            'est', 'sont', 'être', 'avoir', 'fait', 'faire', 'dire', 'peut', 'veut',
            'parle', 'parler', 'explique', 'expliquer', 'donne', 'donner', 'dis', 'dit',
            'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'me', 'te', 'se',
            'moi', 'toi', 'lui', 'leur', 'mon', 'ton', 'son', 'ma', 'ta', 'sa',
            'mes', 'tes', 'ses', 'notre', 'votre', 'nos', 'vos', 'leurs',
            'ce', 'cet', 'cette', 'ces', 'quel', 'quelle', 'quels', 'quelles',
            'que', 'qui', 'quoi', 'dont', 'où', 'comment', 'pourquoi', 'quand',
            'car', 'donc', 'or', 'ni', 'puis', 'alors', 'ainsi', 'aussi', 'encore',
            'plus', 'moins', 'très', 'tout', 'tous', 'toute', 'toutes', 'même', 'autre',
            'bien', 'encore', 'déjà', 'jamais', 'toujours', 'souvent', 'parfois',
            'voici', 'voilà', 's\'il', 'sil', 'merci', 'bonjour', 'bonsoir', 'salut',
            'svp', 'stp', 'peux', 'pouvez', 'pourrait', 'veux', 'voudrais'
        ]);
        return text
            .toLowerCase()
            .replace(/[^\w\s\u00C0-\u017F]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word))
            .slice(0, 10);
    }
    getCategoryFromIntent(intent) {
        if (!intent)
            return undefined;
        const categories = this.intentToCategoryMap.get(intent.name);
        return categories ? categories[0] : undefined;
    }
    isStrategyEnabled(method) {
        const strategy = this.config.strategies.find(s => s.method === method);
        return strategy?.enabled || false;
    }
    getStrategyWeight(method) {
        const strategy = this.config.strategies.find(s => s.method === method);
        return strategy?.weight || 1.0;
    }
    getCacheKey(query) {
        return `${query.text}_${query.intent || ''}_${query.category || ''}`;
    }
    async formatContextForAI(searchResult, maxEntries = 3) {
        const relevantEntries = searchResult.entries.slice(0, maxEntries);
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
    getCacheStats() {
        return {
            keys: this.cache.keys().length,
            hits: this.cache.getStats().hits,
            misses: this.cache.getStats().misses,
            hitRate: this.cache.getStats().hits / (this.cache.getStats().hits + this.cache.getStats().misses)
        };
    }
    clearCache() {
        this.cache.flushAll();
        logger_1.logger.info('Knowledge cache cleared');
    }
}
exports.EnhancedKnowledgeService = EnhancedKnowledgeService;
//# sourceMappingURL=enhancedKnowledgeService.js.map