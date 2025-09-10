import { PinSession, AccountNumber } from '../../types';

/**
 * Interface pour le service de gestion des sessions PIN
 * Définit le contrat pour toutes les opérations de session PIN
 */
export interface IPinSessionService {
  /**
   * Créer une nouvelle session PIN
   */
  createPinSession(phoneNumber: string, action: string, accountNumber?: string): Promise<string>;

  /**
   * Générer un lien PIN unique
   */
  generatePinLink(sessionId: string): string;

  /**
   * Récupérer une session PIN
   */
  getPinSession(sessionId: string): Promise<PinSession | null>;

  /**
   * Traiter la soumission d'un PIN
   */
  processPinSubmission(sessionId: string, pin: string): Promise<{ success: boolean; message: string }>;

  /**
   * Soumettre un PIN pour validation
   */
  submitPin(sessionId: string, pin: string): Promise<{ success: boolean; message: string }>;

  /**
   * Obtenir une session active par téléphone et action
   */
  getActiveSessionByPhoneAndAction(phoneNumber: string, action: string): Promise<PinSession | null>;

  /**
   * Vérifier si une session PIN valide existe pour un utilisateur
   * et retourner les comptes bancaires si disponibles
   */
  getValidSessionWithAccounts(phoneNumber: string): Promise<{ session: PinSession; accounts: AccountNumber[] } | null>;

  /**
   * Mettre à jour le numéro de compte d'une session
   */
  updateSessionAccount(sessionId: string, accountNumber: string): Promise<void>;

  /**
   * Traiter l'action avec le compte sélectionné
   */
  processActionWithAccount(sessionId: string): Promise<void>;

  /**
   * Nettoyer les sessions expirées
   */
  cleanupExpiredSessions(): Promise<void>;

  /**
   * Créer un message avec lien PIN
   */
  createPinRequestMessage(sessionId: string, action: string): string;
}