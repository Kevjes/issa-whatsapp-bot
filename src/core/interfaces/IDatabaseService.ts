import { TokenRecord } from '../../types';

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
   * Sauvegarder un token
   */
  saveToken(token: TokenRecord): Promise<void>;

  /**
   * Obtenir le dernier token valide
   */
  getLatestToken(): Promise<TokenRecord | null>;

  /**
   * Nettoyer les anciens tokens
   */
  cleanupOldTokens(): Promise<void>;

  /**
   * Fermer la connexion à la base de données
   */
  close(): Promise<void>;
}