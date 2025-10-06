"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorSearchService = void 0;
const transformers_1 = require("@xenova/transformers");
const logger_1 = require("../utils/logger");
class VectorSearchService {
    constructor() {
        this.embedder = null;
        this.vectors = new Map();
        this.initialized = false;
        this.modelName = 'Xenova/distiluse-base-multilingual-cased-v2';
    }
    async initialize() {
        if (this.initialized) {
            return;
        }
        try {
            logger_1.logger.info('Initialisation VectorSearchService...', {
                model: this.modelName
            });
            this.embedder = await (0, transformers_1.pipeline)('feature-extraction', this.modelName);
            this.initialized = true;
            logger_1.logger.info('VectorSearchService initialisé avec succès', {
                model: this.modelName,
                status: 'ready'
            });
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de l\'initialisation de VectorSearchService', {
                error: error instanceof Error ? error.message : 'Unknown error',
                model: this.modelName
            });
            throw error;
        }
    }
    async generateEmbedding(text) {
        if (!this.embedder) {
            throw new Error('VectorSearchService non initialisé');
        }
        try {
            const output = await this.embedder(text, {
                pooling: 'mean',
                normalize: true
            });
            return Array.from(output.data);
        }
        catch (error) {
            logger_1.logger.error('Erreur génération embedding', {
                error: error instanceof Error ? error.message : 'Unknown error',
                textLength: text.length
            });
            throw error;
        }
    }
    async precomputeEmbeddings(entries) {
        if (!this.initialized) {
            await this.initialize();
        }
        logger_1.logger.info('Pré-calcul des embeddings...', {
            entriesCount: entries.length
        });
        const startTime = Date.now();
        let processed = 0;
        for (const entry of entries) {
            if (!entry.id) {
                logger_1.logger.warn('Entrée sans ID ignorée', { title: entry.title });
                continue;
            }
            try {
                const text = `${entry.title}\n${entry.content}`;
                const embedding = await this.generateEmbedding(text);
                this.vectors.set(entry.id, embedding);
                processed++;
                if (processed % 5 === 0) {
                    logger_1.logger.debug(`Embeddings: ${processed}/${entries.length}`);
                }
            }
            catch (error) {
                logger_1.logger.error('Erreur embedding pour entrée', {
                    entryId: entry.id,
                    title: entry.title,
                    error
                });
            }
        }
        const duration = Date.now() - startTime;
        logger_1.logger.info('Embeddings pré-calculés avec succès', {
            total: entries.length,
            processed,
            cached: this.vectors.size,
            duration: `${duration}ms`,
            avgPerEntry: `${Math.round(duration / processed)}ms`
        });
    }
    cosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length) {
            throw new Error('Vecteurs de tailles différentes');
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);
        if (normA === 0 || normB === 0) {
            return 0;
        }
        return dotProduct / (normA * normB);
    }
    async searchSemantic(query, allEntries, topK = 5) {
        if (!this.initialized) {
            await this.initialize();
        }
        if (this.vectors.size === 0 && allEntries.length > 0) {
            await this.precomputeEmbeddings(allEntries);
        }
        try {
            const queryEmbedding = await this.generateEmbedding(query);
            const scores = [];
            for (const [id, embedding] of this.vectors.entries()) {
                const similarity = this.cosineSimilarity(queryEmbedding, embedding);
                scores.push({ id, score: similarity });
            }
            scores.sort((a, b) => b.score - a.score);
            const topScores = scores.slice(0, topK);
            const results = [];
            for (const { id, score } of topScores) {
                const entry = allEntries.find(e => e.id === id);
                if (entry) {
                    results.push({ entry, score });
                }
            }
            logger_1.logger.debug('Recherche sémantique terminée', {
                query,
                resultsCount: results.length,
                topScore: results[0]?.score.toFixed(4),
                avgScore: results.length > 0
                    ? (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(4)
                    : '0'
            });
            return results;
        }
        catch (error) {
            logger_1.logger.error('Erreur recherche sémantique', {
                error: error instanceof Error ? error.message : 'Unknown error',
                query
            });
            return [];
        }
    }
    getEmbedding(entryId) {
        return this.vectors.get(entryId);
    }
    async setEmbedding(entryId, entry) {
        const text = `${entry.title}\n${entry.content}`;
        const embedding = await this.generateEmbedding(text);
        this.vectors.set(entryId, embedding);
        logger_1.logger.debug('Embedding mis à jour', { entryId, title: entry.title });
    }
    removeEmbedding(entryId) {
        this.vectors.delete(entryId);
    }
    clearCache() {
        this.vectors.clear();
        logger_1.logger.info('Cache d\'embeddings vidé');
    }
    getStats() {
        const firstVector = this.vectors.values().next().value;
        return {
            initialized: this.initialized,
            model: this.modelName,
            cachedEmbeddings: this.vectors.size,
            vectorDimension: firstVector ? firstVector.length : null
        };
    }
    isReady() {
        return this.initialized && this.embedder !== null;
    }
}
exports.VectorSearchService = VectorSearchService;
//# sourceMappingURL=vectorSearchService.js.map