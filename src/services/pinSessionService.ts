import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { logger } from '../utils/logger';
import { DatabaseService } from './databaseService';
import { BankingService } from './bankingService';
import { IWhatsAppService } from '../core/interfaces/IWhatsAppService';
import { IPinSessionService } from '../core/interfaces/IPinSessionService';
import { AccountNumber, PinSession } from '../types';
import { AuthTemplates, ErrorTemplates, BankingTemplates } from '../templates';
import { TransferSessionService } from './transferSessionService';

export class PinSessionService implements IPinSessionService {
  private activeSessions: Map<string, PinSession> = new Map();

  constructor(
    private databaseService: DatabaseService,
    private bankingService: BankingService,
    private whatsappService: IWhatsAppService,
    private transferSessionService?: TransferSessionService
  ) {
    // Nettoyer les sessions expirées toutes les 5 minutes
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
  }

  /**
   * Créer une nouvelle session PIN
   */
  async createPinSession(phoneNumber: string, action: string, accountNumber?: string): Promise<string> {
    try {
      const sessionId = uuidv4();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + config.pin.sessionTimeoutMinutes * 60 * 1000);

      const session: PinSession = {
        id: sessionId,
        phoneNumber,
        action,
        accountNumber,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        isCompleted: false,
        isExpired: false,
        isLinkUsed: false
      };

      // Sauvegarder en base de données
      await this.databaseService.createPinSession(session);
      
      // Garder en mémoire pour un accès rapide
      this.activeSessions.set(sessionId, session);

      logger.info('Session PIN created', { sessionId, phoneNumber, action });
      
      return sessionId;
    } catch (error) {
      logger.error('Error creating session PIN', { phoneNumber, action, error });
      throw error;
    }
  }

  /**
   * Générer un lien PIN unique
   */
  generatePinLink(sessionId: string): string {
    const baseUrl = config.pin.baseUrl;
    return `${baseUrl}/pin/${sessionId}`;
  }

  /**
   * Récupérer une session PIN
   */
  async getPinSession(sessionId: string): Promise<PinSession | null> {
    try {
      // Vérifier d'abord en mémoire
      let session = this.activeSessions.get(sessionId);
      
      if (!session) {
        // Si pas en mémoire, chercher en base de données
        const dbSession = await this.databaseService.getPinSession(sessionId);
        session = dbSession || undefined;
        
        if (session) {
          this.activeSessions.set(sessionId, session);
        }
      }

      // Vérifier si la session n'est pas expirée
      if (session && new Date(session.expiresAt) > new Date() && !session.isCompleted) {
        return session;
      }

      return null;
    } catch (error) {
      logger.error('Error retrieving session PIN', { sessionId, error });
      return null;
    }
  }

  /**
   * Traiter la soumission d'un PIN
   */
  async processPinSubmission(sessionId: string, pin: string): Promise<{ success: boolean; message: string }> {
    try {
      const session = await this.getPinSession(sessionId);
      
      if (!session) {
        return AuthTemplates.createInvalidSessionMessage();
      }

      // Vérifier si le lien PIN a déjà été utilisé
      if (session.isLinkUsed) {
        logger.warn('Pin link already used', { sessionId, phoneNumber: session.phoneNumber });
        return {
          success: false,
          message: 'This link has already been used. Please restart from WhatsApp.'
        };
      }

      // Marquer le lien comme utilisé immédiatement pour éviter les utilisations multiples
      await this.databaseService.markPinLinkAsUsed(sessionId);
      session.isLinkUsed = true;
      this.activeSessions.set(sessionId, session);

      // Valider le PIN
      if (!this.bankingService.isValidPin(pin)) {
        return AuthTemplates.createInvalidPinApiMessage();
      }

      // Traiter l'action demandée
      await this.processAction(session, pin);
      
      // Note: La session sera marquée comme complétée seulement après la sélection du compte
      // dans processActionWithAccount si un compte spécifique est sélectionné

      return AuthTemplates.createPinValidationSuccessMessage();
    } catch (error) {
      logger.error('Error processing PIN', { sessionId, error });
      return AuthTemplates.createPinProcessingErrorMessage();
    }
  }

  /**
   * Traiter l'action demandée après validation du PIN
   */
  private async processAction(session: PinSession, pin: string): Promise<void> {
    try {
      logger.info('Processing action', { sessionId: session.id, action: session.action });

      // Pour l'action 'new_pin_input', pas besoin d'authentification
      if (session.action === 'new_pin_input') {
        await this.handleNewPinInput(session, pin);
        return;
      }

      // Authentifier l'utilisateur avec son PIN pour les autres actions
      const loginResponse = await this.bankingService.loginWithPin(session.phoneNumber, pin);

      if (!loginResponse.success) {
        await this.whatsappService.sendMessage(
          AuthTemplates.createAuthErrorMessage(session.phoneNumber, loginResponse.message)
        );
        return;
      }

      // Sauvegarder les comptes bancaires dans la session et marquer l'authentification
      if (loginResponse.accounts && loginResponse.accounts.length > 0) {
        session.accounts = loginResponse.accounts;
        const lastAuthenticatedAt = new Date().toISOString();
        await this.databaseService.updateSessionAccounts(session.id, loginResponse.accounts);
        await this.databaseService.updateSessionLastAuthenticated(session.id, lastAuthenticatedAt);

        // Mettre à jour la session en mémoire après la base de données
        session.accounts = loginResponse.accounts;
        session.lastAuthenticatedAt = lastAuthenticatedAt; // Marquer le moment de l'authentification
        this.activeSessions.set(session.id, session);
        logger.info('Bank accounts saved in session', { sessionId: session.id, accountsCount: loginResponse.accounts.length });
      }

      // Traiter selon l'action demandée
      switch (session.action) {
        case 'balance':
          await this.handleBalanceAction(session, loginResponse.accounts || []);
          break;
        case 'info':
          await this.handleAccountInfoAction(session, loginResponse.accounts || []);
          break;
        case 'statement':
          await this.handleMiniStatementAction(session, loginResponse.accounts || []);
          break;
        case 'transfer':
          await this.handleTransferAction(session, loginResponse.accounts || []);
          break;
        case 'change_pin':
          await this.handleChangePinAction(session, pin);
          break;
        default:
          await this.whatsappService.sendMessage(
            ErrorTemplates.createUnknownOptionMessage(session.phoneNumber)
          );
      }
    } catch (error) {
      logger.error('Error processing action', { sessionId: session.id, error });
      
      await this.whatsappService.sendMessage(
        ErrorTemplates.createTechnicalErrorMessage(session.phoneNumber)
      );
    }
  }

  /**
   * Gérer l'action de consultation de solde
   */
  private async handleBalanceAction(session: PinSession, accounts: any[]): Promise<void> {
    if (session.accountNumber) {
      // Compte spécifique sélectionné
      const balance = await this.bankingService.getAccountBalance(session.accountNumber);
      
      await this.whatsappService.sendMessage(
        BankingTemplates.createBalanceMessage(session.phoneNumber, balance, session.accountNumber)
      );
    } else {
      // Afficher la liste des comptes pour sélection
      await this.whatsappService.sendMessage(
        BankingTemplates.createAccountSelectionMessage(session.phoneNumber, accounts, 'balance')
      );
    }
  }

  /**
   * Gérer l'action d'information de compte
   */
  private async handleAccountInfoAction(session: PinSession, accounts: any[]): Promise<void> {
    if (session.accountNumber) {
      const accountInfo = await this.bankingService.getAccountInfo(session.accountNumber);
      
      await this.whatsappService.sendMessage(
        BankingTemplates.createAccountInfoMessage(session.phoneNumber, accountInfo, session.accountNumber)
      );
    } else {
      await this.whatsappService.sendMessage(
        BankingTemplates.createAccountSelectionMessage(session.phoneNumber, accounts, 'info')
      );
    }
  }

  /**
   * Gérer l'action de mini relevé
   */
  private async handleMiniStatementAction(session: PinSession, accounts: any[]): Promise<void> {
    if (session.accountNumber) {
      const history = await this.bankingService.getAccountHistory(session.accountNumber, 5);
      
      // Récupérer la devise du compte depuis la liste des comptes
      const accountInfo = accounts.find(acc => acc.accountValue === session.accountNumber);
      const accountCurrency = accountInfo?.currency;
      
      await this.whatsappService.sendMessage(
        BankingTemplates.createMiniStatementMessage(session.phoneNumber, history, session.accountNumber, accountCurrency)
      );
    } else {
      await this.whatsappService.sendMessage(
        BankingTemplates.createAccountSelectionMessage(session.phoneNumber, accounts, 'statement')
      );
    }
  }

  /**
   * Gérer l'action de transfert intra-bancaire
   */
  private async handleTransferAction(session: PinSession, accounts: any[]): Promise<void> {
    if (session.accountNumber) {
      // Compte expéditeur sélectionné, démarrer le processus de transfert
      if (this.transferSessionService) {
        const transferSessionId = await this.transferSessionService.createTransferSession(
          session.phoneNumber, 
          session.accountNumber
        );
        
        // Envoyer le message de demande de compte bénéficiaire
        await this.whatsappService.sendMessage(
          BankingTemplates.createReceiverAccountInputMessage(session.phoneNumber, session.accountNumber)
        );
        
        logger.info('Transfer session created', { 
          pinSessionId: session.id, 
          transferSessionId, 
          senderAccount: session.accountNumber 
        });
      } else {
        logger.error('TransferSessionService not available');
        await this.whatsappService.sendMessage(
          ErrorTemplates.createTechnicalErrorMessage(session.phoneNumber)
        );
      }
    } else {
      // Afficher la liste des comptes pour sélection du compte expéditeur
      await this.whatsappService.sendMessage(
        BankingTemplates.createAccountSelectionMessage(session.phoneNumber, accounts, 'transfer')
      );
    }
  }

  /**
   * Gérer l'action de changement de PIN
   */
  private async handleChangePinAction(session: PinSession, currentPin: string): Promise<void> {
    try {
      // Créer un lien pour saisir le nouveau PIN
      const newPinSessionId = await this.createPinSession(session.phoneNumber, 'new_pin_input');
      const newPinLink = this.generatePinLink(newPinSessionId);
      
      // Stocker le PIN actuel dans la session pour la validation finale
      const newPinSession = this.activeSessions.get(newPinSessionId);
      if (newPinSession) {
        newPinSession.metadata = { currentPin };
        this.activeSessions.set(newPinSessionId, newPinSession);
        
        // Sauvegarder les métadonnées en base de données
        await this.databaseService.updateSessionMetadata(newPinSessionId, { currentPin });
      }
      
      await this.whatsappService.sendMessage(
        AuthTemplates.createNewPinRequestMessage(session.phoneNumber, newPinLink)
      );
      
      // Marquer la session actuelle comme complétée
      await this.completePinSession(session.id);
      
      logger.info('Change PIN workflow initiated', { 
        sessionId: session.id, 
        newPinSessionId,
        phoneNumber: session.phoneNumber 
      });
    } catch (error) {
      logger.error('Error handling change PIN action', { sessionId: session.id, error });
      await this.whatsappService.sendMessage(
        ErrorTemplates.createTechnicalErrorMessage(session.phoneNumber)
      );
    }
  }

  /**
   * Gérer la saisie du nouveau PIN
   */
  private async handleNewPinInput(session: PinSession, newPin: string): Promise<void> {
    try {
      // Récupérer le PIN actuel depuis les métadonnées de la session
      const currentPin = session.metadata?.currentPin;
      
      if (!currentPin) {
        logger.error('Current PIN not found in session metadata', { sessionId: session.id });
        await this.whatsappService.sendMessage(
          ErrorTemplates.createTechnicalErrorMessage(session.phoneNumber)
        );
        return;
      }
      
      // Valider le nouveau PIN
      if (!this.bankingService.isValidPin(newPin)) {
        await this.whatsappService.sendMessage(
          AuthTemplates.createInvalidPinMessage(session.phoneNumber)
        );
        return;
      }
      
      // Vérifier que le nouveau PIN est différent de l'ancien
      if (currentPin === newPin) {
        await this.whatsappService.sendMessage(
          AuthTemplates.createSamePinErrorMessage(session.phoneNumber)
        );
        return;
      }
      
      // Effectuer le changement de PIN
      const changeResult = await this.bankingService.changePin(
        session.phoneNumber,
        currentPin,
        newPin
      );
      
      if (changeResult.success) {
        await this.whatsappService.sendMessage(
          AuthTemplates.createPinChangeSuccessMessage(session.phoneNumber)
        );
        
        logger.info('PIN changed successfully', { 
          sessionId: session.id,
          phoneNumber: session.phoneNumber 
        });
      } else {
        await this.whatsappService.sendMessage(
          AuthTemplates.createPinChangeErrorMessage(session.phoneNumber, changeResult.message)
        );
        
        logger.error('PIN change failed', { 
          sessionId: session.id,
          phoneNumber: session.phoneNumber,
          error: changeResult.message 
        });
      }
      
      // Marquer la session comme complétée
      await this.completePinSession(session.id);
      
    } catch (error) {
      logger.error('Error handling new PIN input', { sessionId: session.id, error });
      await this.whatsappService.sendMessage(
        ErrorTemplates.createTechnicalErrorMessage(session.phoneNumber)
      );
    }
  }
 
   /**
    * Marquer une session comme complétée
    */
  private async completePinSession(sessionId: string): Promise<void> {
    try {
      await this.databaseService.completePinSession(sessionId);
      
      // Mettre à jour en mémoire
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.isCompleted = true;
        this.activeSessions.set(sessionId, session);
      }

      logger.info('Session PIN marked as completed', { sessionId });
    } catch (error) {
      logger.error('Error completing session PIN', { sessionId, error });
    }
  }

  /**
   * Soumettre un PIN pour validation
   */
  async submitPin(sessionId: string, pin: string): Promise<{ success: boolean; message: string }> {
    return await this.processPinSubmission(sessionId, pin);
  }

  /**
   * Obtenir une session active par téléphone et action
   */
  async getActiveSessionByPhoneAndAction(phoneNumber: string, action: string): Promise<PinSession | null> {
    try {
      // Chercher d'abord en mémoire
      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (session.phoneNumber === phoneNumber && 
            session.action === action && 
            !session.isCompleted && 
            new Date(session.expiresAt) > new Date()) {
          return session;
        }
      }

      // Si pas trouvé en mémoire, chercher en base de données
      const dbSession = await this.databaseService.getActiveSessionByPhoneAndAction(phoneNumber, action);
      if (dbSession) {
        // Ajouter à la mémoire
        this.activeSessions.set(dbSession.id, dbSession);
        return dbSession;
      }

      return null;
    } catch (error) {
      logger.error('Error retrieving active session', { phoneNumber, action, error });
      return null;
    }
  }

  /**
   * Vérifier si une session PIN valide existe pour un utilisateur
   * et retourner les comptes bancaires si disponibles
   */
  async getValidSessionWithAccounts(phoneNumber: string): Promise<{ session: PinSession; accounts: AccountNumber[] } | null> {
    try {
      const now = new Date();
      const pinValidityDuration = config.pin.sessionTimeoutMinutes * 60 * 1000; // 5 minutes en millisecondes

      // Chercher une session valide (non expirée et non complétée)
      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (session.phoneNumber === phoneNumber && 
            !session.isCompleted && 
            new Date(session.expiresAt) > now &&
            session.accounts && session.accounts.length > 0) {
          
          // Vérifier si l'authentification PIN est encore valide
          if (session.lastAuthenticatedAt) {
            const lastAuthTime = new Date(session.lastAuthenticatedAt);
            const timeSinceAuth = now.getTime() - lastAuthTime.getTime();
            
            if (timeSinceAuth <= pinValidityDuration) {
              logger.info("PIN apparement valide",
                {
                  sessionId,
                  session,
                  timeSinceAuth: Math.round(timeSinceAuth / 1000 / 60) + ' minutes'
                }
              )
              return { session, accounts: session.accounts };
            } else {
              // L'authentification PIN a expiré, nettoyer la session
              logger.info('PIN authentication expired for session', { 
                sessionId, 
                phoneNumber, 
                timeSinceAuth: Math.round(timeSinceAuth / 1000 / 60) + ' minutes' 
              });
              session.accounts = undefined;
              session.lastAuthenticatedAt = undefined;
              this.activeSessions.set(sessionId, session);
              this.databaseService.updateSessionLastAuthenticated(sessionId, null);
              this.databaseService.updateSessionAccounts(sessionId, []);
            }
          }
        }
      }

      // Si pas trouvé en mémoire, chercher en base de données
      const dbSession = await this.databaseService.getValidSessionWithAccounts(phoneNumber);
      if (dbSession && dbSession.accounts && dbSession.accounts.length > 0) {
        // Vérifier si l'authentification PIN est encore valide pour la session de la DB
        if (dbSession.session.lastAuthenticatedAt) {
          const lastAuthTime = new Date(dbSession.session.lastAuthenticatedAt);
          const timeSinceAuth = now.getTime() - lastAuthTime.getTime();
          
          if (timeSinceAuth <= pinValidityDuration) {
             // Ajouter à la mémoire
             this.activeSessions.set(dbSession.session.id, dbSession.session);
             return { session: dbSession.session, accounts: dbSession.accounts };
           } else {
             // L'authentification PIN a expiré pour la session de la DB
             logger.info('PIN authentication expired for DB session', { 
               sessionId: dbSession.session.id, 
               phoneNumber, 
               timeSinceAuth: Math.round(timeSinceAuth / 1000 / 60) + ' minutes' 
             });
           }
         }
       }

      return null;
    } catch (error) {
      logger.error('Error retrieving valid session with accounts', { phoneNumber, error });
      return null;
    }
  }

  /**
   * Mettre à jour le numéro de compte d'une session
   */
  async updateSessionAccount(sessionId: string, accountNumber: string): Promise<void> {
    try {
      // Mettre à jour en mémoire
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.accountNumber = accountNumber;
        this.activeSessions.set(sessionId, session);
      }

      // Mettre à jour en base de données
      await this.databaseService.updateSessionAccount(sessionId, accountNumber);
      
      logger.info('Account number updated for session', { sessionId, accountNumber });
    } catch (error) {
      logger.error('Error updating session account', { sessionId, accountNumber, error });
      throw error;
    }
  }

  /**
   * Mettre à jour l'action d'une session
   */
  async updateSessionAction(sessionId: string, action: string): Promise<void> {
    try {
      // Mettre à jour en mémoire
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.action = action;
        this.activeSessions.set(sessionId, session);
      }

      // Mettre à jour en base de données
      await this.databaseService.updateSessionAction(sessionId, action);
      
      logger.info('Action updated for session', { sessionId, action });
    } catch (error) {
      logger.error('Error updating session action', { sessionId, action, error });
      throw error;
    }
  }

  /**
   * Traiter l'action avec le compte sélectionné
   */
  async processActionWithAccount(sessionId: string): Promise<void> {
    try {
      const session = await this.databaseService.getPinSession(sessionId);
      
      if (!session) {
        throw new Error('Session non trouvée');
      }

      if (!session.accountNumber) {
        throw new Error('Numéro de compte manquant');
      }

      // Traiter selon l'action demandée
      switch (session.action) {
        case 'balance':
          await this.processBalanceForAccount(session);
          break;
        case 'statement':
          await this.processMiniStatementForAccount(session);
          break;
        case 'info':
          await this.processAccountInfoForAccount(session);
          break;
        case 'transfer':
          await this.processTransferForAccount(session);
          break;
        default:
          throw new Error(`Action not supported: ${session.action}`);
      }

      // Note: La session reste active jusqu'à expiration pour permettre d'autres opérations
      logger.info('Action processed successfully, session remains active', { sessionId, action: session.action });
      
    } catch (error) {
      logger.error('Error processing action with account', { sessionId, error });
      throw error;
    }
  }

  /**
   * Traiter la consultation de solde pour un compte spécifique
   */
  private async processBalanceForAccount(session: PinSession): Promise<void> {
    const balance = await this.bankingService.getAccountBalance(session.accountNumber!);
    
    await this.whatsappService.sendMessage(
      BankingTemplates.createBalanceMessage(session.phoneNumber, balance, session.accountNumber!)
    );
  }

  /**
   * Traiter le mini relevé pour un compte spécifique
   */
  private async processMiniStatementForAccount(session: PinSession): Promise<void> {
    const history = await this.bankingService.getAccountHistory(session.accountNumber!, 5);
    
    // Récupérer les informations du compte pour obtenir la devise
    let accountCurrency: string | undefined;
    try {
      const accountInfo = await this.bankingService.getAccountInfo(session.accountNumber!);
      if (accountInfo && accountInfo.returnValue && accountInfo.returnValue.currency) {
        accountCurrency = accountInfo.returnValue.currency;
      }
    } catch (error) {
      logger.warn('Could not retrieve account currency for mini statement', { accountNumber: session.accountNumber, error });
    }
    
    await this.whatsappService.sendMessage(
      BankingTemplates.createMiniStatementMessage(session.phoneNumber, history, session.accountNumber!, accountCurrency)
    );
  }

  /**
   * Traiter les informations de compte pour un compte spécifique
   */
  private async processAccountInfoForAccount(session: PinSession): Promise<void> {
    const accountInfo = await this.bankingService.getAccountInfo(session.accountNumber!);
    
    await this.whatsappService.sendMessage(
      BankingTemplates.createAccountInfoMessage(session.phoneNumber, accountInfo, session.accountNumber!)
    );
  }

  /**
   * Traiter l'action de transfert pour un compte spécifique
   */
  private async processTransferForAccount(session: PinSession): Promise<void> {
    if (!session.accountNumber) {
      throw new Error('Account number missing for transfer action');
    }

    // Start the transfer process
    if (this.transferSessionService) {
      const transferSessionId = await this.transferSessionService.createTransferSession(
        session.phoneNumber, 
        session.accountNumber
      );
      
      // Send the message to request the beneficiary account
      await this.whatsappService.sendMessage(
        BankingTemplates.createReceiverAccountInputMessage(session.phoneNumber, session.accountNumber)
      );
      
      logger.info('Transfer session created from PIN', { 
        pinSessionId: session.id, 
        transferSessionId, 
        senderAccount: session.accountNumber 
      });
    } else {
      logger.error('TransferSessionService not available');
      await this.whatsappService.sendMessage(
        ErrorTemplates.createTechnicalErrorMessage(session.phoneNumber)
      );
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const now = new Date();
      
      // Clean up in memory
      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (new Date(session.expiresAt) <= now || session.isCompleted) {
          this.activeSessions.delete(sessionId);
        }
      }

      // Clean up in database
      await this.databaseService.cleanupExpiredSessions();
      
      logger.debug('Expired sessions cleaned up');
    } catch (error) {
      logger.error('Error cleaning up expired sessions', { error });
    }
  }

  /**
   * Create a message with PIN link
   */
  createPinRequestMessage(sessionId: string, action: string): string {
    const pinLink = this.generatePinLink(sessionId);
    
    const actionText = {
      'balance': 'check your balance',
      'info': 'view your account information',
      'statement': 'obtain your mini statement'
    }[action] || 'perform this operation';

    return `🔐 *PIN required*\n\n` +
           `To ${actionText}, please click on the link below to enter your PIN :\n\n` +
           `🔗 ${pinLink}\n\n` +
           `⏰ This link expires in 10 minutes.\n` +
           `🔒 Your PIN is secure and will never be stored.`;
  }
}