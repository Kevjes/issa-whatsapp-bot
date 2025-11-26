import { KnowledgeBase } from '../types';
import { DatabaseService } from './databaseService';
import { VectorSearchService } from './vectorSearchService';
export declare class KnowledgeService {
    private databaseService;
    private cache;
    private queryNormalizer;
    private vectorSearch;
    private useVectorSearch;
    constructor(databaseService: DatabaseService);
    initializeKnowledgeBase(): Promise<void>;
    private loadROIData;
    private loadROITakafulData;
    private loadTakafulDefinitionData;
    private loadISSAIdentityData;
    private addROISpecificEntries;
    private addTakafulSpecificEntries;
    search(query: string): Promise<KnowledgeBase[]>;
    addEntry(entry: Omit<KnowledgeBase, 'id' | 'createdAt' | 'updatedAt'>): Promise<number>;
    getContextForQuery(query: string): Promise<string>;
    private rerankByTitleMatch;
    getCacheStats(): {
        keys: number;
        hits: number;
        misses: number;
        ksize: number;
        vsize: number;
    };
    clearCache(): void;
    warmupCache(): Promise<void>;
    enableVectorSearch(): Promise<void>;
    searchHybrid(query: string, topK?: number): Promise<KnowledgeBase[]>;
    private rerankResults;
    getVectorSearchStats(): ReturnType<VectorSearchService['getStats']>;
    identifyRelevantKeywords(query: string): string[];
    isTakafulQuery(query: string): boolean;
    private loadGlossaireGeneralData;
    private loadNoticeInformationData;
    private loadTakafulAutomobileData;
    private loadSanteGroupeData;
}
//# sourceMappingURL=knowledgeService.d.ts.map