/**
 * Types pour le système de recherche de connaissances optimisé
 * Architecture: Domain Layer (Clean Architecture)
 */

/**
 * Entrée de base de connaissances (déjà existant mais amélioré)
 */
export interface KnowledgeEntry {
  id?: number;
  category: KnowledgeCategory;
  title: string;
  content: string;
  keywords: string[];
  tags?: string[]; // Tags supplémentaires pour recherche
  embeddings?: number[]; // Vecteurs pour recherche sémantique (optionnel)
  relevanceScore?: number; // Score de pertinence calculé
  priority?: number; // Priorité de l'entrée (0-10)
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  metadata?: Record<string, any>;
}

/**
 * Catégories de connaissances
 */
export type KnowledgeCategory =
  | 'roi_general'           // ROI général
  | 'roi_products'          // Produits ROI
  | 'roi_services'          // Services ROI
  | 'takaful_general'       // Takaful général
  | 'takaful_products'      // Produits Takaful
  | 'takaful_principles'    // Principes Takaful
  | 'auto_insurance'        // Assurance auto
  | 'health_insurance'      // Assurance santé
  | 'home_insurance'        // Assurance habitation
  | 'life_insurance'        // Assurance vie
  | 'pricing'               // Tarification
  | 'claims'                // Réclamations
  | 'faq'                   // Questions fréquentes
  | 'legal'                 // Juridique
  | 'contact'               // Contact et support
  | 'other';                // Autre

/**
 * Requête de recherche de connaissances
 */
export interface KnowledgeSearchQuery {
  text: string;
  intent?: string; // Intention détectée
  category?: KnowledgeCategory; // Filtrer par catégorie
  entities?: Array<{ type: string; value: string }>; // Entités extraites
  maxResults?: number; // Nombre max de résultats
  minRelevance?: number; // Score de pertinence minimal
  context?: KnowledgeSearchContext;
}

/**
 * Contexte de recherche
 */
export interface KnowledgeSearchContext {
  userId: number;
  conversationHistory?: string[];
  previousSearches?: string[];
  userPreferences?: Record<string, any>;
  workflowContext?: Record<string, any>;
}

/**
 * Résultat de recherche
 */
export interface KnowledgeSearchResult {
  entries: ScoredKnowledgeEntry[];
  totalFound: number;
  query: KnowledgeSearchQuery;
  searchMethod: SearchMethod;
  processingTime: number; // en ms
  suggestions?: string[]; // Suggestions de recherche
}

/**
 * Entrée avec score de pertinence
 */
export interface ScoredKnowledgeEntry extends KnowledgeEntry {
  relevanceScore: number; // 0-1
  matchedKeywords: string[];
  highlightedContent?: string; // Contenu avec mots-clés surlignés
  reason?: string; // Raison de la pertinence
}

/**
 * Méthode de recherche
 */
export type SearchMethod =
  | 'keyword'      // Recherche par mots-clés
  | 'fuzzy'        // Recherche floue
  | 'semantic'     // Recherche sémantique (embeddings)
  | 'intent_based' // Basée sur l'intention
  | 'hybrid';      // Combinaison

/**
 * Stratégie de recherche
 */
export interface SearchStrategy {
  name: string;
  method: SearchMethod;
  weight: number; // Poids dans la recherche hybride (0-1)
  enabled: boolean;
  config?: Record<string, any>;
}

/**
 * Configuration de recherche
 */
export interface KnowledgeSearchConfig {
  strategies: SearchStrategy[];
  defaultMaxResults: number;
  defaultMinRelevance: number;
  enableCaching: boolean;
  cacheExpiration: number; // en secondes
  enableLogging: boolean;
  fuzzyMatchThreshold: number; // Seuil pour fuzzy matching (0-1)
}

/**
 * Index de recherche (pour optimisation)
 */
export interface SearchIndex {
  keyword: string;
  entryIds: number[];
  frequency: number;
  lastUpdated: string;
}

/**
 * Statistiques de recherche
 */
export interface SearchStatistics {
  totalSearches: number;
  successfulSearches: number;
  failedSearches: number;
  averageProcessingTime: number;
  topQueries: Array<{ query: string; count: number }>;
  topCategories: Array<{ category: KnowledgeCategory; count: number }>;
}

/**
 * Configuration d'indexation
 */
export interface IndexingConfig {
  enableFullTextIndex: boolean;
  enableKeywordIndex: boolean;
  enableSemanticIndex: boolean;
  stopWords: string[]; // Mots à ignorer
  minKeywordLength: number;
  maxKeywordLength: number;
}

/**
 * Contexte enrichi pour l'IA
 */
export interface AIKnowledgeContext {
  relevantEntries: KnowledgeEntry[];
  searchQuery: string;
  intent?: string;
  category?: KnowledgeCategory;
  conversationContext?: string;
  formattedContext: string; // Contexte formaté pour l'IA
}
