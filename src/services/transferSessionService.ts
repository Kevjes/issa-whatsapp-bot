import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { isInitWord } from '../utils/validation';
import { BankingService } from './bankingService';
import { OtpAuthService } from './otpAuthService';
import { IWhatsAppService } from '../core/interfaces/IWhatsAppService';
import { TransferSession, TransferRequest } from '../types';
import { BankingTemplates, ErrorTemplates } from '../templates';
import { MenuTemplates } from '../templates/menu';
import { getRandomWelcomeImage } from '../utils/imageUtils';

export class TransferSessionService {
  private activeSessions: Map<string, TransferSession> = new Map();
  private otpAuthService: OtpAuthService;

  constructor(
    private bankingService: BankingService,
    private whatsappService: IWhatsAppService
  ) {
    // Récupérer le service d'authentification depuis le service bancaire
    const authService = this.bankingService ? (this.bankingService as any).authService : null;
    this.otpAuthService = new OtpAuthService(authService);
    // Nettoyer les sessions expirées toutes les 5 minutes
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
  }

  /**
   * Créer une nouvelle session de transfert
   */
  async createTransferSession(phoneNumber: string, senderAccount: string): Promise<string> {
    try {
      const sessionId = uuidv4();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // Expire dans 15 minutes

      // Récupérer les informations du compte expéditeur pour obtenir la devise
      let senderCurrency = 'SSP'; // Devise par défaut
      try {
        const senderAccountInfo = await this.bankingService.getAccountInfo(senderAccount);
        if (senderAccountInfo && senderAccountInfo.returnValue && senderAccountInfo.returnValue.currency) {
          senderCurrency = senderAccountInfo.returnValue.currency;
        }
      } catch (error) {
        logger.warn('Failed to retrieve sender account currency, using default SSP', { senderAccount, error });
      }

      const session: TransferSession = {
        id: sessionId,
        phoneNumber,
        senderAccount,
        currency: senderCurrency,
        step: 'receiver_input',
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString()
      };

      // Garder en mémoire pour un accès rapide
      this.activeSessions.set(sessionId, session);

      logger.logSessionActivity(sessionId, 'session_created', {
        phoneNumber,
        senderAccount,
        currency: senderCurrency,
        step: 'receiver_input'
      });
      logger.info('Transfer session created', { sessionId, phoneNumber, senderAccount, currency: senderCurrency });
      
      return sessionId;
    } catch (error) {
      logger.error('Failed to create transfer session', { phoneNumber, senderAccount, error });
      throw error;
    }
  }

  /**
   * Récupérer une session de transfert
   */
  async getTransferSession(phoneNumber: string): Promise<TransferSession | null> {
    try {
      // Chercher la session active pour ce numéro de téléphone
      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (session.phoneNumber === phoneNumber && new Date(session.expiresAt) > new Date()) {
          return session;
        }
      }
      return null;
    } catch (error) {
      logger.error('Failed to retrieve transfer session', { phoneNumber, error });
      return null;
    }
  }

  /**
   * Mettre à jour une session de transfert
   */
  async updateTransferSession(phoneNumber: string, updates: Partial<TransferSession>): Promise<boolean> {
    try {
      const session = await this.getTransferSession(phoneNumber);
      if (!session) {
        return false;
      }

      // Mettre à jour la session
      Object.assign(session, updates);
      this.activeSessions.set(session.id, session);

      logger.info('Transfer session updated', { sessionId: session.id, updates });
      return true; 
    } catch (error) {
      logger.error('Failed to update transfer session', { phoneNumber, error });
      return false;
    }
  }

  /**
   * Fermer la session de transfert et renvoyer le message d'accueil
   */
  private async closeSessionAndReturnToMenu(phoneNumber: string): Promise<void> {
    try {
      // Supprimer la session active
      const session = await this.getTransferSession(phoneNumber);
      if (session) {
        this.activeSessions.delete(session.id);
        logger.info('Transfer session closed due to initialization word', { 
          sessionId: session.id, 
          phoneNumber 
        });
      }

      const imageSent = await this.whatsappService.sendImageMessage(
        phoneNumber, 
        getRandomWelcomeImage(), 
        ''
      );
      if (imageSent) {
        logger.info('Image sent successfully', { to: phoneNumber });
      } else {
        logger.warn('Failed to send logo image', { to: phoneNumber });
      }
      // Envoyer le message d'accueil
      await this.whatsappService.sendMessage(
        MenuTemplates.createWelcomeMessage(phoneNumber)
      );
    } catch (error) {
      logger.error('Failed to close session and return to menu', { phoneNumber, error });
      await this.whatsappService.sendMessage(
        ErrorTemplates.createTechnicalErrorMessage(phoneNumber)
      );
    }
  }

  /**
   * Traiter l'entrée du numéro de compte bénéficiaire
   */
  async processReceiverAccountInput(phoneNumber: string, receiverAccount: string): Promise<void> {
    try {
      // Vérifier si c'est un mot d'initialisation
      if (isInitWord(receiverAccount)) {
        await this.closeSessionAndReturnToMenu(phoneNumber);
        return;
      }

      const session = await this.getTransferSession(phoneNumber);
      if (!session || session.step !== 'receiver_input') {
        await this.whatsappService.sendMessage(
          ErrorTemplates.createSessionExpiredMessage(phoneNumber)
        );
        return;
      }

      // Valider le format du numéro de compte
      if (!this.isValidAccountNumber(receiverAccount)) {
        await this.whatsappService.sendMessage(
          ErrorTemplates.createInvalidFormatMessage(phoneNumber, 'The account number must contain only digits and have between 10 and 20 characters.')
        );
        return;
      }

      // Vérifier que ce n'est pas le même compte que l'expéditeur
      if (receiverAccount === session.senderAccount) {
        await this.whatsappService.sendMessage(
          ErrorTemplates.createInvalidFormatMessage(phoneNumber, 'You cannot transfer to the same account.')
        );
        return;
      }

      // Récupérer les informations du compte bénéficiaire
      let accountInfo;
      let accountHolderName = 'N/A';
      
      try {
        accountInfo = await this.bankingService.getAccountInfo(receiverAccount);
        
        // Extraire le nom du titulaire du compte depuis la réponse API
        if (accountInfo && accountInfo.returnValue) {
          // Selon la documentation Swagger, les informations du compte sont dans returnValue
          const accountData = accountInfo.returnValue;
          if (accountData.owner) {
            accountHolderName = accountData.owner;
          }
        }
        
        logger.info('Account info retrieved successfully', { 
          receiverAccount, 
          accountHolderName 
        });
      } catch (error) {
        logger.warn('Failed to retrieve account info, using default name', { 
          receiverAccount, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        
        // Si on ne peut pas récupérer les infos, on continue avec un nom générique
        // mais on vérifie quand même si le compte existe
        await this.whatsappService.sendMessage(
          BankingTemplates.createInvalidReceiverAccountMessage(phoneNumber)
        );
        return;
      }

      // Mettre à jour la session avec les informations du compte
      await this.updateTransferSession(phoneNumber, {
        receiverAccount,
        receiverAccountHolder: accountHolderName,
        step: 'receiver_confirmation'
      });

      // Envoyer le message de confirmation avec boutons interactifs
      await this.whatsappService.sendMessage(
        BankingTemplates.createReceiverAccountConfirmationMessage(
          phoneNumber, 
          receiverAccount,
          accountHolderName
        )
      );
    } catch (error) {
      logger.error('Failed to process receiver account input', { phoneNumber, receiverAccount, error });
      await this.whatsappService.sendMessage(
        ErrorTemplates.createTechnicalErrorMessage(phoneNumber)
      );
    }
  }

  /**
   * Traiter l'entrée du montant
   */
  async processAmountInput(phoneNumber: string, amountText: string): Promise<void> {
    try {
      // Vérifier si c'est un mot d'initialisation
      if (isInitWord(amountText)) {
        await this.closeSessionAndReturnToMenu(phoneNumber);
        return;
      }

      const session = await this.getTransferSession(phoneNumber);
      if (!session || session.step !== 'amount_input') {
        await this.whatsappService.sendMessage(
          ErrorTemplates.createSessionExpiredMessage(phoneNumber)
        );
        return;
      }

      // Valider et parser le montant
      const amount = this.parseAmount(amountText);
      if (amount === null || amount <= 0) {
        await this.whatsappService.sendMessage(
          ErrorTemplates.createInvalidFormatMessage(phoneNumber, 'Please enter a valid amount in integer format only (example: 50, 1200). Decimal amounts are not accepted.')
        );
        return;
      }

      // Vérifier les limites de montant (exemple: minimum 1, maximum 1000000)
      const sessionCurrency = session.currency || 'SSP';
      if (amount < 1) {
        await this.whatsappService.sendMessage(
          ErrorTemplates.createInvalidFormatMessage(phoneNumber, `The minimum transfer amount is 1 ${sessionCurrency}.`)
        );
        return;
      }

      // Mettre à jour la session et passer à l'étape de raison
      await this.updateTransferSession(phoneNumber, {
        amount,
        step: 'reason_input'
      });

      // Envoyer le message de demande de raison
      await this.whatsappService.sendMessage(
        BankingTemplates.createReasonInputMessage(phoneNumber, amount, sessionCurrency)
      );

    } catch (error) {
      logger.error('Failed to process amount input', { phoneNumber, amountText, error });
      await this.whatsappService.sendMessage(
        ErrorTemplates.createTechnicalErrorMessage(phoneNumber)
      );
    }
  }

  /**
   * Traiter l'entrée de la raison
   */
  async processReasonInput(phoneNumber: string, reason: string): Promise<void> {
    try {
      // Vérifier si c'est un mot d'initialisation
      if (isInitWord(reason)) {
        await this.closeSessionAndReturnToMenu(phoneNumber);
        return;
      }

      const session = await this.getTransferSession(phoneNumber);
      if (!session || session.step !== 'reason_input') {
        await this.whatsappService.sendMessage(
          ErrorTemplates.createSessionExpiredMessage(phoneNumber)
        );
        return;
      }

      // Valider la raison
      if (!reason || reason.trim().length < 3) {
        await this.whatsappService.sendMessage(
          ErrorTemplates.createInvalidFormatMessage(phoneNumber, 'Please enter a valid reason (minimum 3 characters).')
        );
        return;
      }

      if (reason.length > 100) {
        await this.whatsappService.sendMessage(
          ErrorTemplates.createInvalidFormatMessage(phoneNumber, 'Please enter a valid reason (maximum 100 characters).')
        );
        return;
      }

      // Mettre à jour la session et passer à l'étape de prévisualisation
      await this.updateTransferSession(phoneNumber, {
        reason: reason.trim(),
        step: 'preview'
      });

      // Créer l'objet de transfert pour la prévisualisation
      const transferData: TransferRequest = {
        senderAccount: session.senderAccount!,
        receiverAccount: session.receiverAccount!,
        amount: session.amount!,
        reason: reason.trim(),
        currency: session.currency || 'SSP'
      };

      // Envoyer le message de prévisualisation avec le nom du titulaire
      await this.whatsappService.sendMessage(
        BankingTemplates.createTransferPreviewMessage(phoneNumber, transferData, session.receiverAccountHolder)
      );

    } catch (error) {
      logger.error('Failed to process reason input', { phoneNumber, reason, error });
      await this.whatsappService.sendMessage(
        ErrorTemplates.createTechnicalErrorMessage(phoneNumber)
      );
    }
  }



  /**
   * Initier l'authentification OTP pour le transfert
   */
  async initiateOtpAuthentication(phoneNumber: string): Promise<void> {
    try {
      const session = await this.getTransferSession(phoneNumber);
      if (!session || session.step !== 'preview') {
        await this.whatsappService.sendMessage(
          ErrorTemplates.createSessionExpiredMessage(phoneNumber)
        );
        return;
      }

      // Envoyer l'OTP
      const otpResult = await this.otpAuthService.sendOtp(phoneNumber);
      
      if (otpResult.success) {
        // Mettre à jour la session pour passer à l'étape OTP
        await this.updateTransferSession(phoneNumber, {
          step: 'otp_verification'
        });

        // Envoyer le message demandant l'OTP
        await this.whatsappService.sendMessage(
          BankingTemplates.createOtpRequestMessage(phoneNumber)
        );
      } else {
        await this.whatsappService.sendMessage(
          ErrorTemplates.createGenericErrorMessage(phoneNumber, 'Impossible to send verification code. Please try again.')
        );
      }

    } catch (error) {
      logger.error('Failed to initiate OTP authentication', { phoneNumber, error });
      await this.whatsappService.sendMessage(
        ErrorTemplates.createTechnicalErrorMessage(phoneNumber)
      );
    }
  }

  /**
   * Traiter la validation OTP
   */
  async processOtpValidation(phoneNumber: string, otp: string): Promise<void> {
    try {
      const session = await this.getTransferSession(phoneNumber);
      if (!session || session.step !== 'otp_verification') {
        await this.whatsappService.sendMessage(
          ErrorTemplates.createSessionExpiredMessage(phoneNumber)
        );
        return;
      }

      // Valider le format de l'OTP
      if (!this.otpAuthService.isValidOtpFormat(otp)) {
        await this.whatsappService.sendMessage(
          ErrorTemplates.createInvalidFormatMessage(phoneNumber, 'Le code de vérification doit contenir 4 à 6 chiffres.')
        );
        return;
      }

      // Valider l'OTP avec l'API
      const validationResult = await this.otpAuthService.validateOtp(phoneNumber, otp);
      
      if (validationResult.success) {
        // OTP valide, exécuter le transfert
        await this.executeTransfer(phoneNumber);
      } else {
        // OTP invalide, renvoyer au menu
        await this.whatsappService.sendMessage(
          ErrorTemplates.createInvalidOtpMessage(phoneNumber)
        );
        
        // Supprimer la session et rediriger vers le menu
        this.activeSessions.delete(session.id);
      }

    } catch (error) {
      logger.error('Failed to process OTP validation', { phoneNumber, otp: '***', error });
      await this.whatsappService.sendMessage(
        ErrorTemplates.createTechnicalErrorMessage(phoneNumber)
      );
    }
  }

  /**
   * Exécuter le transfert - initie l'OTP ou exécute le transfert selon l'étape
   */
  async executeTransfer(phoneNumber: string): Promise<void> {
    try {
      const session = await this.getTransferSession(phoneNumber);
      if (!session) {
        await this.whatsappService.sendMessage(
          ErrorTemplates.createSessionExpiredMessage(phoneNumber)
        );
        return;
      }

      if (session.step === 'preview') {
        // Étape de confirmation finale - initier l'authentification OTP
        await this.initiateOtpAuthentication(phoneNumber);
      } else if (session.step === 'otp_verification') {
        // Étape après validation OTP - exécuter le transfert réel
        await this.performActualTransfer(phoneNumber);
      } else {
        await this.whatsappService.sendMessage(
          ErrorTemplates.createSessionExpiredMessage(phoneNumber)
        );
      }
    } catch (error) {
      logger.error('Failed to execute transfer', { phoneNumber, error });
      await this.whatsappService.sendMessage(
        ErrorTemplates.createTechnicalErrorMessage(phoneNumber)
      );
    }
  }

  /**
   * Exécuter le transfert réel après validation OTP
   */
  private async performActualTransfer(phoneNumber: string): Promise<void> {
    try {
      const session = await this.getTransferSession(phoneNumber);
      if (!session) {
        await this.whatsappService.sendMessage(
          ErrorTemplates.createSessionExpiredMessage(phoneNumber)
        );
        return;
      }

      // Créer la requête de transfert selon le format TransfertDTO
      const transferRequest = {
        senderAccNo: session.senderAccount!,
        receiverAccNo: session.receiverAccount!,
        amount: session.amount!,
        reason: session.reason!,
        currencyRecAcc: 'SSP',
        benefName: session.receiverAccountHolder || 'Account holder',
        type: 'VIREMENT_SIMPLE',
        sameCustomer: true
      };

      // Exécuter le transfert
      const transferResponse = await this.bankingService.doTransfer(transferRequest);

      if (transferResponse.success) {
        // Créer un objet TransferRequest pour l'affichage
        const displayTransferData: TransferRequest = {
          senderAccount: session.senderAccount!,
          receiverAccount: transferResponse.returnValue?.recipientAccount || '',
          amount: session.amount!,
          reason: session.reason!,
          currency: session.currency || 'SSP'
        };
        
        // Transfert réussi
        await this.whatsappService.sendMessage(
          BankingTemplates.createTransferSuccessMessage(phoneNumber, transferResponse, displayTransferData)
        );

        // Marquer la session comme terminée
        await this.updateTransferSession(phoneNumber, {
          step: 'completed'
        });

        // Supprimer la session
        this.activeSessions.delete(session.id);
      } else {
        // Transfert échoué
        await this.whatsappService.sendMessage(
          BankingTemplates.createTransferErrorMessage(phoneNumber, transferResponse.returnMsg || 'Unknown error')
        );
      }

    } catch (error) {
      logger.error('Failed to execute transfer', { phoneNumber, error });
      await this.whatsappService.sendMessage(
        BankingTemplates.createTransferErrorMessage(phoneNumber, 'An error occurred. Please try again.')
      );
    }
  }

  /**
   * Annuler une session de transfert
   */
  async cancelTransfer(phoneNumber: string): Promise<void> {
    try {
      const session = await this.getTransferSession(phoneNumber);
      if (session) {
        this.activeSessions.delete(session.id);
        logger.info('Transfer session cancelled', { sessionId: session.id, phoneNumber });
      }
    } catch (error) {
      logger.error('Failed to cancel transfer', { phoneNumber, error });
    }
  }

  /**
   * Nettoyer les sessions expirées
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (new Date(session.expiresAt) <= now) {
        this.activeSessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Expired transfer sessions cleaned', { count: cleanedCount });
    }
  }

  /**
   * Validate account number format
   */
  private isValidAccountNumber(accountNumber: string): boolean {
    // Le numéro de compte doit contenir uniquement des chiffres et avoir entre 10 et 20 caractères
    const accountRegex = /^\d{10,20}$/;
    return accountRegex.test(accountNumber);
  }

  /**
   * Parse and validate an amount
   */
  private parseAmount(amountText: string): number | null {
    try {
      // Nettoyer le texte (supprimer espaces)
      const cleanText = amountText.replace(/\s/g, '');
      
      // Vérifier qu'il n'y a pas de point décimal ou de virgule décimale
      if (cleanText.includes('.') || cleanText.includes(',')) {
        return null; // Refuser les nombres décimaux
      }
      
      // Vérifier que le texte ne contient que des chiffres
      if (!/^\d+$/.test(cleanText)) {
        return null;
      }
      
      const amount = parseInt(cleanText, 10);
      
      if (isNaN(amount) || !isFinite(amount)) {
        return null;
      }
      
      return amount;
    } catch {
      return null;
    }
  }
}