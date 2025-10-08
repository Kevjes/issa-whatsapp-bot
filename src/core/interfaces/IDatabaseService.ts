/**
 * Interface pour le service de base de données
 */
import { WorkflowContext } from '../../types/workflow';
import { KnowledgeEntry } from '../../types/knowledge';

export interface IDatabaseService {
  /**
   * Initialiser la base de données
   */
  initialize(): Promise<void>;

  /**
   * Créer les tables nécessaires
   */
  createTables(): Promise<void>;

  /**
   * Fermer la connexion à la base de données
   */
  close(): Promise<void>;

  /**
   * Sauvegarder le contexte d'un workflow
   */
  saveWorkflowContext(userId: number, context: WorkflowContext): Promise<void>;

  /**
   * Charger le contexte d'un workflow actif
   */
  loadWorkflowContext(userId: number): Promise<WorkflowContext | null>;

  /**
   * Obtenir toutes les entrées de la base de connaissances
   */
  getAllKnowledgeEntries(): Promise<KnowledgeEntry[]>;

  /**
   * Obtenir les entrées par catégorie
   */
  getKnowledgeByCategory(category: string): Promise<KnowledgeEntry[]>;

  /**
   * Rechercher dans la base de connaissances
   */
  searchKnowledgeBase(query: string): Promise<KnowledgeEntry[]>;

  /**
   * Ajouter une entrée dans la base de connaissances
   */
  addKnowledgeEntry(entry: Omit<KnowledgeEntry, 'id'>): Promise<number>;
}