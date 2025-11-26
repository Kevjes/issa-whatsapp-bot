/**
 * VectorSearchService - Recherche sémantique par embeddings vectoriels
 *
 * Utilise des embeddings multilingues (français) pour comprendre le sens des requêtes
 * au-delà des mots-clés exacts.
 *
 * Fonctionnalités :
 * - Génération d'embeddings avec modèle multilingue
 * - Calcul de similarité cosinus
 * - Recherche sémantique des documents les plus pertinents
 * - Cache des embeddings pour performance
 */

import { pipeline, FeatureExtractionPipeline } from '@xenova/transformers';
import { KnowledgeBase } from '../types';
import { logger } from '../utils/logger';

interface VectorEntry {
  id: number;
  embedding: number[];
}

interface SearchResult {
  entry: KnowledgeBase;
  score: number;
}

export class VectorSearchService {
  private embedder: FeatureExtractionPipeline | null = null;
  private vectors: Map<number, number[]> = new Map();
  private initialized: boolean = false;

  // Modèle multilingue qui supporte le français
  private readonly modelName = 'Xenova/distiluse-base-multilingual-cased-v2';

  /**
   * Initialiser le service avec le modèle d'embeddings
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      logger.info('Initialisation VectorSearchService...', {
        model: this.modelName
      });

      // Charger le modèle d'embeddings
      this.embedder = await pipeline('feature-extraction', this.modelName);

      this.initialized = true;

      logger.info('VectorSearchService initialisé avec succès', {
        model: this.modelName,
        status: 'ready'
      });

    } catch (error) {
      logger.error('Erreur lors de l\'initialisation de VectorSearchService', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: this.modelName
      });
      throw error;
    }
  }

  /**
   * Générer l'embedding d'un texte
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.embedder) {
      throw new Error('VectorSearchService non initialisé');
    }

    try {
      const output = await this.embedder(text, {
        pooling: 'mean',
        normalize: true
      });

      // Convertir tensor en array
      return Array.from(output.data as Float32Array);

    } catch (error) {
      logger.error('Erreur génération embedding', {
        error: error instanceof Error ? error.message : 'Unknown error',
        textLength: text.length
      });
      throw error;
    }
  }

  /**
   * Pré-calculer les embeddings pour toutes les entrées de la base
   */
  async precomputeEmbeddings(entries: KnowledgeBase[]): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    logger.info('Pré-calcul des embeddings...', {
      entriesCount: entries.length
    });

    const startTime = Date.now();
    let processed = 0;

    for (const entry of entries) {
      if (!entry.id) {
        logger.warn('Entrée sans ID ignorée', { title: entry.title });
        continue;
      }

      try {
        // Combiner titre et contenu pour embedding complet
        const text = `${entry.title}\n${entry.content}`;

        // Générer embedding
        const embedding = await this.generateEmbedding(text);

        // Stocker dans le cache
        this.vectors.set(entry.id, embedding);

        processed++;

        if (processed % 5 === 0) {
          logger.debug(`Embeddings: ${processed}/${entries.length}`);
        }

      } catch (error) {
        logger.error('Erreur embedding pour entrée', {
          entryId: entry.id,
          title: entry.title,
          error
        });
      }
    }

    const duration = Date.now() - startTime;

    logger.info('Embeddings pré-calculés avec succès', {
      total: entries.length,
      processed,
      cached: this.vectors.size,
      duration: `${duration}ms`,
      avgPerEntry: `${Math.round(duration / processed)}ms`
    });
  }

  /**
   * Calculer la similarité cosinus entre deux vecteurs
   */
  public cosineSimilarity(vecA: number[], vecB: number[]): number {
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

  /**
   * Rechercher les entrées les plus similaires à une requête
   */
  async searchSemantic(
    query: string,
    allEntries: KnowledgeBase[],
    topK: number = 5
  ): Promise<SearchResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Si aucun embedding en cache, pré-calculer
    if (this.vectors.size === 0 && allEntries.length > 0) {
      await this.precomputeEmbeddings(allEntries);
    }

    try {
      // Générer embedding de la requête
      const queryEmbedding = await this.generateEmbedding(query);

      // Calculer similarité avec toutes les entrées
      const scores: Array<{ id: number; score: number }> = [];

      for (const [id, embedding] of this.vectors.entries()) {
        const similarity = this.cosineSimilarity(queryEmbedding, embedding);
        scores.push({ id, score: similarity });
      }

      // Trier par score décroissant
      scores.sort((a, b) => b.score - a.score);

      // Prendre les top K
      const topScores = scores.slice(0, topK);

      // Mapper aux entrées complètes
      const results: SearchResult[] = [];

      for (const { id, score } of topScores) {
        const entry = allEntries.find(e => e.id === id);
        if (entry) {
          results.push({ entry, score });
        }
      }

      logger.debug('Recherche sémantique terminée', {
        query,
        resultsCount: results.length,
        topScore: results[0]?.score.toFixed(4),
        avgScore: results.length > 0
          ? (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(4)
          : '0'
      });

      return results;

    } catch (error) {
      logger.error('Erreur recherche sémantique', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query
      });
      return [];
    }
  }

  /**
   * Obtenir l'embedding d'une entrée si déjà en cache
   */
  getEmbedding(entryId: number): number[] | undefined {
    return this.vectors.get(entryId);
  }

  /**
   * Ajouter/mettre à jour un embedding pour une entrée
   */
  async setEmbedding(entryId: number, entry: KnowledgeBase): Promise<void> {
    const text = `${entry.title}\n${entry.content}`;
    const embedding = await this.generateEmbedding(text);
    this.vectors.set(entryId, embedding);

    logger.debug('Embedding mis à jour', { entryId, title: entry.title });
  }

  /**
   * Supprimer un embedding du cache
   */
  removeEmbedding(entryId: number): void {
    this.vectors.delete(entryId);
  }

  /**
   * Vider le cache des embeddings
   */
  clearCache(): void {
    this.vectors.clear();
    logger.info('Cache d\'embeddings vidé');
  }

  /**
   * Obtenir les statistiques du cache
   */
  getStats(): {
    initialized: boolean;
    model: string;
    cachedEmbeddings: number;
    vectorDimension: number | null;
  } {
    const firstVector = this.vectors.values().next().value as number[] | undefined;

    return {
      initialized: this.initialized,
      model: this.modelName,
      cachedEmbeddings: this.vectors.size,
      vectorDimension: firstVector ? firstVector.length : null
    };
  }

  /**
   * Vérifier si le service est prêt
   */
  isReady(): boolean {
    return this.initialized && this.embedder !== null;
  }
}
