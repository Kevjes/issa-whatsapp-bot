import { DashboardUser, DashboardSession } from '../../types/dashboard';

/**
 * Interface pour le service d'authentification du dashboard
 */
export interface IDashboardAuthService {
  /**
   * Authentifier un utilisateur admin
   */
  authenticate(username: string, password: string): Promise<{
    success: boolean;
    token?: string;
    user?: DashboardUser;
    expiresAt?: string;
    message?: string;
  }>;

  /**
   * Valider un token de session
   */
  validateToken(token: string): Promise<{
    valid: boolean;
    user?: DashboardUser;
    session?: DashboardSession;
  }>;

  /**
   * Rafraîchir un token de session
   */
  refreshToken(token: string): Promise<{
    success: boolean;
    newToken?: string;
    expiresAt?: string;
  }>;

  /**
   * Déconnecter un utilisateur
   */
  logout(token: string): Promise<boolean>;

  /**
   * Obtenir les sessions actives
   */
  getActiveSessions(): Promise<DashboardSession[]>;

  /**
   * Révoquer une session
   */
  revokeSession(sessionId: string): Promise<boolean>;

  /**
   * Nettoyer les sessions expirées
   */
  cleanupExpiredSessions(): Promise<number>;

  /**
   * Obtenir les informations d'un utilisateur par token
   */
  getUserByToken(token: string): Promise<DashboardUser | null>;

  /**
   * Vérifier les permissions d'un utilisateur
   */
  checkPermission(userId: string, permission: string): Promise<boolean>;

  /**
   * Enregistrer l'activité de connexion
   */
  logLoginActivity(userId: string, ipAddress?: string, userAgent?: string): Promise<void>;
}