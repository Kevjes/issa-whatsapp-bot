import { KnowledgeBase } from '../types';
interface SearchResult {
    entry: KnowledgeBase;
    score: number;
}
export declare class VectorSearchService {
    private embedder;
    private vectors;
    private initialized;
    private readonly modelName;
    initialize(): Promise<void>;
    generateEmbedding(text: string): Promise<number[]>;
    precomputeEmbeddings(entries: KnowledgeBase[]): Promise<void>;
    private cosineSimilarity;
    searchSemantic(query: string, allEntries: KnowledgeBase[], topK?: number): Promise<SearchResult[]>;
    getEmbedding(entryId: number): number[] | undefined;
    setEmbedding(entryId: number, entry: KnowledgeBase): Promise<void>;
    removeEmbedding(entryId: number): void;
    clearCache(): void;
    getStats(): {
        initialized: boolean;
        model: string;
        cachedEmbeddings: number;
        vectorDimension: number | null;
    };
    isReady(): boolean;
}
export {};
//# sourceMappingURL=vectorSearchService.d.ts.map