import { DatabaseService } from './databaseService';
import { VectorSearchService } from './vectorSearchService';
import { KnowledgeSearchResult, KnowledgeSearchConfig, AIKnowledgeContext } from '../types/knowledge';
import { Intent } from '../types/intent';
export declare class EnhancedKnowledgeService {
    private databaseService;
    private vectorSearchService;
    private cache;
    private config;
    private readonly intentToCategoryMap;
    private readonly categoryWeights;
    constructor(databaseService: DatabaseService, vectorSearchService: VectorSearchService, config?: Partial<KnowledgeSearchConfig>);
    searchByIntent(query: string, intent?: Intent, maxResults?: number): Promise<KnowledgeSearchResult>;
    private hybridSearch;
    private keywordSearch;
    private fuzzySearch;
    private intentBasedSearch;
    private semanticSearch;
    private scoreEntry;
    private calculateFuzzyScore;
    private stringSimilarity;
    private levenshteinDistance;
    private mergeResults;
    private extractKeywords;
    private getCategoryFromIntent;
    private isStrategyEnabled;
    private getStrategyWeight;
    private getCacheKey;
    formatContextForAI(searchResult: KnowledgeSearchResult, maxEntries?: number): Promise<AIKnowledgeContext>;
    getCacheStats(): {
        keys: number;
        hits: number;
        misses: number;
        hitRate: number;
    };
    clearCache(): void;
}
//# sourceMappingURL=enhancedKnowledgeService.d.ts.map