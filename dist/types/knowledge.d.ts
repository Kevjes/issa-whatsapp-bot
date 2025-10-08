export interface KnowledgeEntry {
    id?: number;
    category: KnowledgeCategory;
    title: string;
    content: string;
    keywords: string[];
    tags?: string[];
    embeddings?: number[];
    relevanceScore?: number;
    priority?: number;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
    metadata?: Record<string, any>;
}
export type KnowledgeCategory = 'roi_general' | 'roi_products' | 'roi_services' | 'takaful_general' | 'takaful_products' | 'takaful_principles' | 'auto_insurance' | 'health_insurance' | 'home_insurance' | 'life_insurance' | 'pricing' | 'claims' | 'faq' | 'legal' | 'contact' | 'other';
export interface KnowledgeSearchQuery {
    text: string;
    intent?: string;
    category?: KnowledgeCategory;
    entities?: Array<{
        type: string;
        value: string;
    }>;
    maxResults?: number;
    minRelevance?: number;
    context?: KnowledgeSearchContext;
}
export interface KnowledgeSearchContext {
    userId: number;
    conversationHistory?: string[];
    previousSearches?: string[];
    userPreferences?: Record<string, any>;
    workflowContext?: Record<string, any>;
}
export interface KnowledgeSearchResult {
    entries: ScoredKnowledgeEntry[];
    totalFound: number;
    query: KnowledgeSearchQuery;
    searchMethod: SearchMethod;
    processingTime: number;
    suggestions?: string[];
}
export interface ScoredKnowledgeEntry extends KnowledgeEntry {
    relevanceScore: number;
    matchedKeywords: string[];
    highlightedContent?: string;
    reason?: string;
}
export type SearchMethod = 'keyword' | 'fuzzy' | 'semantic' | 'intent_based' | 'hybrid';
export interface SearchStrategy {
    name: string;
    method: SearchMethod;
    weight: number;
    enabled: boolean;
    config?: Record<string, any>;
}
export interface KnowledgeSearchConfig {
    strategies: SearchStrategy[];
    defaultMaxResults: number;
    defaultMinRelevance: number;
    enableCaching: boolean;
    cacheExpiration: number;
    enableLogging: boolean;
    fuzzyMatchThreshold: number;
}
export interface SearchIndex {
    keyword: string;
    entryIds: number[];
    frequency: number;
    lastUpdated: string;
}
export interface SearchStatistics {
    totalSearches: number;
    successfulSearches: number;
    failedSearches: number;
    averageProcessingTime: number;
    topQueries: Array<{
        query: string;
        count: number;
    }>;
    topCategories: Array<{
        category: KnowledgeCategory;
        count: number;
    }>;
}
export interface IndexingConfig {
    enableFullTextIndex: boolean;
    enableKeywordIndex: boolean;
    enableSemanticIndex: boolean;
    stopWords: string[];
    minKeywordLength: number;
    maxKeywordLength: number;
}
export interface AIKnowledgeContext {
    relevantEntries: KnowledgeEntry[];
    searchQuery: string;
    intent?: string;
    category?: KnowledgeCategory;
    conversationContext?: string;
    formattedContext: string;
}
//# sourceMappingURL=knowledge.d.ts.map