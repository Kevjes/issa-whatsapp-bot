import { WhatsAppOutgoingMessage } from '../../types';

/**
 * Interface pour le service WhatsApp
 * Définit le contrat pour toutes les opérations WhatsApp
 */
export interface IWhatsAppService {
  /**
   * Envoyer un message via WhatsApp
   */
  sendMessage(messageData: WhatsAppOutgoingMessage): Promise<boolean>;

  /**
   * Envoyer un message texte simple
   */
  sendTextMessage(to: string, message: string): Promise<boolean>;

  /**
   * Envoyer un message d'erreur standardisé
   */
  sendErrorMessage(to: string, errorType?: 'technical' | 'validation' | 'rate_limit'): Promise<boolean>;
  
  /**
   * Marquer un message comme lu
   */
  markMessageAsRead(messageId: string): Promise<boolean>;

  /**
   * Simuler l'indicateur "En train d'écrire"
   */
  sendTypingIndicator(to: string, isTyping: boolean): Promise<boolean>;

  /**
   * Vérifier la santé du service
   */
  healthCheck(): Promise<boolean>;

  /**
   * Obtenir les informations du profil business
   */
  getBusinessProfile(): Promise<{ name?: string; description?: string; website?: string; [key: string]: unknown }>;
}