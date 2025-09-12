/**
 * Interface pour le service de base de données
 */
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
}