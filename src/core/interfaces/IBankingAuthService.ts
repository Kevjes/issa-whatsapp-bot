/**
 * Interface pour le service d'authentification bancaire
 */
export interface IBankingAuthService {
  /**
   * Obtenir un token valide (avec renouvellement automatique si nécessaire)
   */
  getValidToken(): Promise<string>;

  /**
   * Invalider le token actuel (forcer un renouvellement)
   */
  invalidateToken(): Promise<void>;

  /**
   * Vérifier si le token actuel est valide
   */
  isTokenValid(): Promise<boolean>;

  /**
   * Renouveler le token
   */
  refreshToken(): Promise<string>;
}