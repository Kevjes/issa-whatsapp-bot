export declare class QueryNormalizer {
    private synonyms;
    private stopWords;
    normalize(text: string): string;
    extractKeywords(text: string): string[];
    stem(word: string): string;
    getSynonyms(word: string): string[];
    expand(query: string): string[];
    toFTS5Query(query: string): string;
    toLikePatterns(query: string): string[];
    detectLanguage(query: string): 'fr' | 'other';
    analyze(query: string): {
        original: string;
        normalized: string;
        keywords: string[];
        stems: string[];
        synonyms: string[];
        expanded: string[];
        language: 'fr' | 'other';
        fts5Query: string;
        likePatterns: string[];
    };
}
//# sourceMappingURL=queryNormalizer.d.ts.map