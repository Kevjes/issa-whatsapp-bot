import { KnowledgeBase } from '../types';
import { DatabaseService } from './databaseService';
import { VectorSearchService } from './vectorSearchService';
import { logger } from '../utils/logger';
import { QueryNormalizer } from '../utils/queryNormalizer';
import * as fs from 'fs';
import * as path from 'path';
import NodeCache from 'node-cache';

export class KnowledgeService {
  private databaseService: DatabaseService;
  private cache: NodeCache;
  private queryNormalizer: QueryNormalizer;
  private vectorSearch: VectorSearchService;
  private useVectorSearch: boolean = false;

  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService;

    // Initialiser le cache avec TTL de 1 heure
    this.cache = new NodeCache({
      stdTTL: 3600,           // 1 heure de durée de vie
      checkperiod: 600,       // Vérifier les expirations toutes les 10 minutes
      useClones: false,       // Pas de clonage pour meilleure performance
      maxKeys: 1000           // Maximum 1000 entrées en cache
    });

    // Initialiser le normalisateur de requêtes
    this.queryNormalizer = new QueryNormalizer();

    // Initialiser le service de recherche vectorielle
    this.vectorSearch = new VectorSearchService();

    logger.info('KnowledgeService initialisé avec cache, normalisation et vectors', {
      ttl: '3600s',
      maxKeys: 1000,
      normalizer: 'QueryNormalizer avec stemming français',
      vectorSearch: 'VectorSearchService (lazy init)'
    });
  }

  /**
   * Initialiser la base de connaissances avec les données ROI
   */
  async initializeKnowledgeBase(): Promise<void> {
    try {
      // Vérifier si des données existent déjà
      const existingEntries = await this.databaseService.searchKnowledgeBase('ROI');
      if (existingEntries.length > 0) {
        logger.info('Base de connaissances déjà initialisée', { entriesCount: existingEntries.length });
        return;
      }

      logger.info('Initialisation de la base de connaissances...');

      // Charger les données d'identité ISSA
      await this.loadISSAIdentityData();

      // Charger les définitions Takaful
      await this.loadTakafulDefinitionData();

      // Charger les données ROI et ROI Takaful
      await this.loadROIData();
      await this.loadROITakafulData();

      logger.info('Base de connaissances initialisée avec succès');
    } catch (error) {
      logger.error('Erreur lors de l\'initialisation de la base de connaissances', { error });
      throw error;
    }
  }

  /**
   * Charger les données générales de ROI
   */
  private async loadROIData(): Promise<void> {
    try {
      const roiFilePath = path.join(process.cwd(), 'docs', 'presentation_ROI.txt');
      
      if (!fs.existsSync(roiFilePath)) {
        logger.warn('Fichier presentation_ROI.txt introuvable', { path: roiFilePath });
        return;
      }

      const content = fs.readFileSync(roiFilePath, 'utf8');
      
      // Ajouter l'entrée principale ROI
      await this.databaseService.addKnowledgeEntry({
        category: 'roi_general',
        title: 'Présentation Générale Royal Onyx Insurance',
        content: content,
        keywords: [
          'royal onyx insurance', 'roi', 'assurance', 'cameroun', 'cima',
          'automobile', 'santé', 'habitation', 'voyage', 'responsabilité civile',
          'multirisques', 'microassurance', 'douala', 'yaoundé', 'agences'
        ],
        isActive: true
      });

      // Extraire et ajouter des entrées spécifiques
      await this.addROISpecificEntries(content);

      logger.info('Données ROI chargées avec succès');
    } catch (error) {
      logger.error('Erreur lors du chargement des données ROI', { error });
      throw error;
    }
  }

  /**
   * Charger les données ROI Takaful
   */
  private async loadROITakafulData(): Promise<void> {
    try {
      const takafulFilePath = path.join(process.cwd(), 'docs', 'presentation_ROI_takaful.txt');
      
      if (!fs.existsSync(takafulFilePath)) {
        logger.warn('Fichier presentation_ROI_takaful.txt introuvable', { path: takafulFilePath });
        return;
      }

      const content = fs.readFileSync(takafulFilePath, 'utf8');
      
      // Ajouter l'entrée principale ROI Takaful
      await this.databaseService.addKnowledgeEntry({
        category: 'roi_takaful',
        title: 'Présentation Générale ROI Takaful',
        content: content,
        keywords: [
          'roi takaful', 'takaful', 'assurance islamique', 'halal', 'charia',
          'wakalah', 'moudharaba', 'tabarru', 'sharia board', 'hajj',
          'assurance conforme', 'principes islamiques', 'bonarpiso'
        ],
        isActive: true
      });

      // Extraire et ajouter des entrées spécifiques Takaful
      await this.addTakafulSpecificEntries(content);

      logger.info('Données ROI Takaful chargées avec succès');
    } catch (error) {
      logger.error('Erreur lors du chargement des données ROI Takaful', { error });
      throw error;
    }
  }

  /**
   * Charger les définitions Takaful
   */
  private async loadTakafulDefinitionData(): Promise<void> {
    try {
      const definitionFilePath = path.join(process.cwd(), 'docs', 'definition_takaful.tx');

      if (!fs.existsSync(definitionFilePath)) {
        logger.warn('Fichier definition_takaful.tx introuvable', { path: definitionFilePath });
        return;
      }

      const content = fs.readFileSync(definitionFilePath, 'utf8');

      // Vérifier si le fichier a du contenu
      if (!content.trim()) {
        logger.info('Fichier definition_takaful.tx vide, ignoré pour le moment');
        return;
      }

      // Ajouter l'entrée des définitions Takaful
      await this.databaseService.addKnowledgeEntry({
        category: 'takaful_definition',
        title: 'Définitions et Concepts Takaful',
        content: content,
        keywords: [
          'définition takaful', 'concepts takaful', 'principes takaful',
          'assurance islamique', 'finance islamique', 'qu\'est-ce que takaful',
          'fonctionnement takaful', 'différence assurance classique',
          'termes techniques', 'vocabulaire takaful', 'glossaire'
        ],
        isActive: true
      });

      logger.info('Définitions Takaful chargées avec succès');
    } catch (error) {
      logger.error('Erreur lors du chargement des définitions Takaful', { error });
      throw error;
    }
  }

  /**
   * Charger les données d'identité d'ISSA
   */
  private async loadISSAIdentityData(): Promise<void> {
    try {
      const issaFilePath = path.join(process.cwd(), 'docs', 'issa.txt');
      
      if (!fs.existsSync(issaFilePath)) {
        logger.warn('Fichier issa.txt introuvable', { path: issaFilePath });
        return;
      }

      const content = fs.readFileSync(issaFilePath, 'utf8');
      
      // Ajouter l'entrée d'identité d'ISSA
      await this.databaseService.addKnowledgeEntry({
        category: 'issa_identity',
        title: 'Identité et Rôle d\'ISSA',
        content: content,
        keywords: [
          'issa', 'assistant virtuel', 'roi takaful', 'royal onyx insurance',
          'royal takaful', 'entreprise mère', 'assurances islamiques',
          'identité', 'présentation', 'qui est issa', 'rôle'
        ],
        isActive: true
      });

      logger.info('Données d\'identité ISSA chargées avec succès');
    } catch (error) {
      logger.error('Erreur lors du chargement des données d\'identité ISSA', { error });
      throw error;
    }
  }

  /**
   * Ajouter des entrées spécifiques pour ROI
   */
  private async addROISpecificEntries(content: string): Promise<void> {
    // Services ROI
    const servicesMatch = content.match(/Services\s*:\s*([\s\S]*?)(?=Actionnariat|$)/);
    if (servicesMatch) {
      await this.databaseService.addKnowledgeEntry({
        category: 'roi_services',
        title: 'Services Royal Onyx Insurance',
        content: `Services offerts par Royal Onyx Insurance :\n${servicesMatch[1].trim()}`,
        keywords: [
          'services', 'assurance automobile', 'transport', 'responsabilité civile',
          'santé', 'accidents', 'voyage', 'multirisques', 'habitation',
          'commercial', 'professionnel', 'industriel', 'chantiers', 'cautions'
        ],
        isActive: true
      });
    }

    // Agences ROI
    const agencesMatch = content.match(/Agences ROI\s*:\s*([\s\S]*?)(?=Service client|$)/);
    if (agencesMatch) {
      await this.databaseService.addKnowledgeEntry({
        category: 'roi_agences',
        title: 'Agences Royal Onyx Insurance',
        content: `Nos agences :\n${agencesMatch[1].trim()}`,
        keywords: [
          'agences', 'douala', 'yaoundé', 'bafoussam', 'bafang', 'bagangté',
          'kribi', 'maroua', 'bertoua', 'garoua', 'ngaoundéré', 'akwa',
          'deido', 'bepanda', 'makepe', 'ndongbon', 'elig-essono', 'bastos'
        ],
        isActive: true
      });
    }

    // Contact ROI
    const contactMatch = content.match(/Service client\s*:\s*([\s\S]*?)(?=CIMA|$)/);
    if (contactMatch) {
      await this.databaseService.addKnowledgeEntry({
        category: 'roi_contact',
        title: 'Contact Royal Onyx Insurance',
        content: `Nos coordonnées :\n${contactMatch[1].trim()}`,
        keywords: [
          'contact', 'service client', 'téléphone', 'email', 'site web',
          '+237 691 100 575', 'contact@royalonyx.cm', 'www.royalonyx.cm'
        ],
        isActive: true
      });
    }
  }

  /**
   * Ajouter des entrées spécifiques pour ROI Takaful
   */
  private async addTakafulSpecificEntries(content: string): Promise<void> {
    // Services Takaful
    const servicesMatch = content.match(/Services\s*:\s*([\s\S]*?)(?=Gouvernance|$)/);
    if (servicesMatch) {
      await this.databaseService.addKnowledgeEntry({
        category: 'takaful_services',
        title: 'Services ROI Takaful',
        content: `Services ROI Takaful :\n${servicesMatch[1].trim()}`,
        keywords: [
          'takaful accidents', 'takaful santé', 'takaful voyage', 'takaful hajj',
          'takaful evacuation', 'takaful automobile', 'takaful habitation',
          'takaful incendie', 'takaful multirisque', 'takaful équipements',
          'takaful responsabilité', 'takaful chantier', 'takaful marchandises',
          'takaful crédit', 'takaful bétail', 'takaful agricole'
        ],
        isActive: true
      });
    }

    // Sharia Board
    const shariaMatch = content.match(/Gouvernance\s*:\s*Sharia Board[\s\S]*?(?=Autres Guichets|$)/);
    if (shariaMatch) {
      await this.databaseService.addKnowledgeEntry({
        category: 'takaful_gouvernance',
        title: 'Sharia Board ROI Takaful',
        content: shariaMatch[0],
        keywords: [
          'sharia board', 'conseil charia', 'conformité islamique', 'fiqh',
          'cheikh nsangou', 'el hadj moussa', 'el hadj mamadou', 'finance islamique'
        ],
        isActive: true
      });
    }

    // Fonctionnement Takaful
    const fonctionnementMatch = content.match(/FONCTIONNEMENT DE LA FENÊTRE ROI TAKAFUL[\s\S]*$/);
    if (fonctionnementMatch) {
      await this.databaseService.addKnowledgeEntry({
        category: 'takaful_fonctionnement',
        title: 'Fonctionnement ROI Takaful',
        content: fonctionnementMatch[0],
        keywords: [
          'fonctionnement takaful', 'wakalah', 'moudharaba', 'tabarru', 'donation',
          'excédents', 'déficits', 'modèle hybride', 'placement', 'wakil', 'moudhareb'
        ],
        isActive: true
      });
    }

    // Contact Takaful
    await this.databaseService.addKnowledgeEntry({
      category: 'takaful_contact',
      title: 'Contact ROI Takaful',
      content: `Nos coordonnées ROI Takaful :
Service client : +237 691 100 575
Email : contact@roitakaful.com
Site web : www.roitakaful.com
Guichet Principal : Douala Cameroun – Quartier Bonapriso, à côté de Total Bonjour`,
      keywords: [
        'contact takaful', 'service client', '+237 691 100 575',
        'contact@roitakaful.com', 'www.roitakaful.com', 'bonapriso'
      ],
      isActive: true
    });
  }

  /**
   * Rechercher dans la base de connaissances (avec normalisation améliorée)
   */
  async search(query: string): Promise<KnowledgeBase[]> {
    // Analyser et normaliser la requête
    const analysis = this.queryNormalizer.analyze(query);

    logger.debug('Requête analysée', {
      original: analysis.original,
      normalized: analysis.normalized,
      keywordsCount: analysis.keywords.length,
      expandedCount: analysis.expanded.length,
      language: analysis.language
    });

    // Créer une requête FTS5 optimisée avec termes élargis
    const fts5Query = analysis.fts5Query;

    // Rechercher avec la requête élargie
    const results = await this.databaseService.searchKnowledgeBase(fts5Query);

    logger.debug('Résultats de recherche normalisée', {
      query: analysis.original,
      fts5Query,
      resultsCount: results.length
    });

    return results;
  }

  /**
   * Ajouter une nouvelle entrée à la base de connaissances
   */
  async addEntry(entry: Omit<KnowledgeBase, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    return await this.databaseService.addKnowledgeEntry(entry);
  }

  /**
   * Obtenir le contexte de connaissance pour une requête (OPTIMISÉ avec cache)
   */
  async getContextForQuery(query: string): Promise<string> {
    try {
      const searchQuery = query.toLowerCase().trim();
      const cacheKey = `context:${searchQuery}`;

      // Vérifier le cache d'abord
      const cachedContext = this.cache.get<string>(cacheKey);
      if (cachedContext) {
        logger.info('Cache HIT pour la recherche', {
          query: searchQuery,
          cacheKey,
          cacheStats: this.getCacheStats()
        });
        return cachedContext;
      }

      logger.info('Cache MISS - Recherche dans la base de connaissances', {
        originalQuery: query,
        searchQuery,
        cacheStats: this.getCacheStats()
      });

      // Essayer plusieurs stratégies de recherche
      let results = await this.search(searchQuery);

      // Si pas de résultats, essayer avec des mots individuels
      if (results.length === 0) {
        const words = searchQuery.split(/\s+/).filter(word => word.length > 2);
        logger.info('Recherche avec mots individuels', { words });

        for (const word of words) {
          const wordResults = await this.search(word);
          results = results.concat(wordResults);
          if (results.length > 0) break; // Arrêter dès qu'on trouve quelque chose
        }

        // Supprimer les doublons
        const uniqueResults = results.filter((result, index, self) =>
          index === self.findIndex(r => r.id === result.id)
        );
        results = uniqueResults;
      }

      logger.info('Résultats de recherche', {
        query: searchQuery,
        resultCount: results.length,
        resultTitles: results.map(r => r.title)
      });

      let context: string;

      if (results.length === 0) {
        logger.warn('Aucun résultat trouvé', { query: searchQuery });
        context = 'Aucune information spécifique trouvée dans la base de connaissances.';
      } else {
        // Limiter à 3 résultats les plus pertinents
        const topResults = results.slice(0, 3);

        context = 'Informations pertinentes :\n\n';
        for (const result of topResults) {
          context += `**${result.title}**\n${result.content}\n\n`;
        }

        logger.info('Contexte généré', {
          query: searchQuery,
          contextLength: context.length,
          resultTitles: topResults.map(r => r.title)
        });
      }

      // Stocker dans le cache
      this.cache.set(cacheKey, context);
      logger.debug('Contexte mis en cache', {
        cacheKey,
        contextLength: context.length,
        cacheStats: this.getCacheStats()
      });

      return context;
    } catch (error) {
      logger.error('Erreur lors de la recherche de contexte', { error, query });
      return 'Erreur lors de la récupération des informations.';
    }
  }

  /**
   * Obtenir les statistiques du cache
   */
  getCacheStats(): { keys: number; hits: number; misses: number; ksize: number; vsize: number } {
    return this.cache.getStats();
  }

  /**
   * Vider le cache (utile pour les mises à jour de la base de connaissances)
   */
  clearCache(): void {
    this.cache.flushAll();
    logger.info('Cache vidé', { stats: this.getCacheStats() });
  }

  /**
   * Pré-charger le cache avec les requêtes fréquentes
   */
  async warmupCache(): Promise<void> {
    const topQueries = [
      'services takaful',
      'contact roi',
      'qu\'est-ce que takaful',
      'agences douala',
      'assurance islamique',
      'roi takaful',
      'sharia board',
      'hajj',
      'wakalah',
      'définition takaful'
    ];

    logger.info('Pré-chargement du cache avec les requêtes fréquentes', {
      queryCount: topQueries.length
    });

    for (const query of topQueries) {
      await this.getContextForQuery(query);
    }

    logger.info('Cache pré-chargé avec succès', {
      stats: this.getCacheStats()
    });
  }

  /**
   * Activer la recherche vectorielle (initialise et pré-calcule les embeddings)
   */
  async enableVectorSearch(): Promise<void> {
    try {
      logger.info('Activation de la recherche vectorielle...');

      // Initialiser le service vectoriel
      await this.vectorSearch.initialize();

      // Récupérer toutes les entrées pour pré-calcul
      const allEntries = await this.databaseService.searchKnowledgeBase('');

      if (allEntries.length > 0) {
        // Pré-calculer les embeddings
        await this.vectorSearch.precomputeEmbeddings(allEntries);
        this.useVectorSearch = true;

        logger.info('Recherche vectorielle activée', {
          entriesIndexed: allEntries.length,
          stats: this.vectorSearch.getStats()
        });
      } else {
        logger.warn('Aucune entrée à indexer pour la recherche vectorielle');
      }

    } catch (error) {
      logger.error('Erreur activation recherche vectorielle', { error });
      this.useVectorSearch = false;
    }
  }

  /**
   * Recherche hybride : combine FTS5, normalisation et vectors
   */
  async searchHybrid(query: string, topK: number = 5): Promise<KnowledgeBase[]> {
    try {
      // Récupérer toutes les entrées
      const allEntries = await this.databaseService.searchKnowledgeBase('');

      // 1. Recherche FTS5 + normalisation (Phase 1 + 2)
      const ftsResults = await this.search(query);

      // 2. Recherche vectorielle sémantique (Phase 3)
      let vectorResults: Array<{ entry: KnowledgeBase; score: number }> = [];

      if (this.useVectorSearch && this.vectorSearch.isReady()) {
        vectorResults = await this.vectorSearch.searchSemantic(query, allEntries, topK * 2);
      }

      // 3. Re-ranking avec Reciprocal Rank Fusion (RRF)
      const combined = this.rerankResults(ftsResults, vectorResults, topK);

      logger.debug('Recherche hybride terminée', {
        query,
        ftsCount: ftsResults.length,
        vectorCount: vectorResults.length,
        finalCount: combined.length
      });

      return combined;

    } catch (error) {
      logger.error('Erreur recherche hybride', { error, query });
      // Fallback sur recherche normale
      return await this.search(query);
    }
  }

  /**
   * Re-ranking avec Reciprocal Rank Fusion (RRF)
   * Combine les scores de plusieurs sources de recherche
   */
  private rerankResults(
    ftsResults: KnowledgeBase[],
    vectorResults: Array<{ entry: KnowledgeBase; score: number }>,
    topK: number
  ): KnowledgeBase[] {
    const k = 60; // Constante RRF standard
    const scores = new Map<number, number>();

    // Score FTS (basé sur le rang)
    ftsResults.forEach((entry, rank) => {
      if (entry.id) {
        const rrfScore = 1 / (k + rank + 1);
        scores.set(entry.id, (scores.get(entry.id) || 0) + rrfScore);
      }
    });

    // Score vectoriel (basé sur le rang ET la similarité cosinus)
    vectorResults.forEach((result, rank) => {
      if (result.entry.id) {
        // RRF score avec boost de similarité
        const rrfScore = 1 / (k + rank + 1);
        const similarityBoost = result.score; // 0-1
        const combinedScore = rrfScore * (1 + similarityBoost);

        scores.set(
          result.entry.id,
          (scores.get(result.entry.id) || 0) + combinedScore
        );
      }
    });

    // Créer un index des entrées par ID
    const entriesById = new Map<number, KnowledgeBase>();
    [...ftsResults, ...vectorResults.map(r => r.entry)].forEach(entry => {
      if (entry.id && !entriesById.has(entry.id)) {
        entriesById.set(entry.id, entry);
      }
    });

    // Trier par score combiné
    const ranked = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(([id]) => entriesById.get(id))
      .filter((entry): entry is KnowledgeBase => entry !== undefined);

    logger.debug('Re-ranking terminé', {
      inputFts: ftsResults.length,
      inputVector: vectorResults.length,
      uniqueEntries: scores.size,
      output: ranked.length
    });

    return ranked;
  }

  /**
   * Obtenir les statistiques de la recherche vectorielle
   */
  getVectorSearchStats(): ReturnType<VectorSearchService['getStats']> {
    return this.vectorSearch.getStats();
  }

  /**
   * Identifier les mots-clés dans une requête utilisateur
   */
  identifyRelevantKeywords(query: string): string[] {
    const keywords = [
      // ROI général
      'roi', 'royal onyx', 'assurance', 'automobile', 'santé', 'habitation',
      'voyage', 'responsabilité', 'multirisques', 'agences', 'contact',

      // ROI Takaful
      'takaful', 'islamique', 'halal', 'charia', 'hajj', 'wakalah',
      'moudharaba', 'sharia board', 'conformité',

      // Définitions et concepts Takaful
      'définition', 'concepts', 'principes', 'qu\'est-ce que',
      'fonctionnement', 'différence', 'termes', 'vocabulaire', 'glossaire',
      'finance islamique', 'assurance classique',

      // Services
      'accidents', 'evacuation', 'incendie', 'chantier', 'crédit',
      'bétail', 'agricole', 'marchandises', 'équipements',

      // Localisation
      'douala', 'yaoundé', 'cameroun', 'bafoussam', 'maroua', 'garoua'
    ];

    const queryLower = query.toLowerCase();
    return keywords.filter(keyword => queryLower.includes(keyword));
  }

  /**
   * Déterminer si la requête concerne ROI Takaful
   */
  isTakafulQuery(query: string): boolean {
    const takafulKeywords = [
      'takaful', 'islamique', 'halal', 'charia', 'hajj', 'wakalah',
      'moudharaba', 'sharia', 'religieux', 'conforme', 'islam',
      'définition takaful', 'qu\'est-ce que takaful', 'concepts takaful',
      'finance islamique', 'assurance islamique'
    ];

    const queryLower = query.toLowerCase();
    return takafulKeywords.some(keyword => queryLower.includes(keyword));
  }
}