import { config } from '../config';
import { logger } from '../utils/logger';
import { BankingLoginResponse, SoldeDTO, AccountNumber, LoginResponse, BankAccount, AccountBalance, Transaction, TransferRequest, TransferResponse, AccountValidationResponse } from '../types';
import { IBankingService } from '../core/interfaces/IBankingService';
import { IHttpClient } from '../core/interfaces/IHttpClient';
import { BankingTemplates } from '../templates';

export class BankingService implements IBankingService {
  private baseUrl: string;
  private authService: any;
  private httpClient: IHttpClient;

  constructor(httpClient: IHttpClient, authService: any) {
    this.baseUrl = config.banking.apiUrl;
    this.authService = authService;
    this.httpClient = httpClient;
  }
  /**
   * Authentifier un utilisateur avec son PIN
   */
  async loginWithPin(phoneNumber: string, pin: string): Promise<BankingLoginResponse> {
    try {
      const token = await this.authService.getValidToken();
      
      const response = await this.httpClient.get<BankingLoginResponse>(
        `/whatsapp/loginWithPin/${phoneNumber}/${pin}`,
        {
          headers: {
            'X-Auth-Token': token
          }
        }
      );

      // Vérifier le contenu de la réponse plutôt que le status code
      // car l'API renvoie toujours 200 même avec de mauvaises informations d'identification
      if (response.data?.success === true) {
        logger.logAuthAttempt(phoneNumber, true, 'PIN');
        logger.info('Login with PIN successful', { 
          phoneNumber, 
          success: response.data.success,
          data: response.data,
          accountsCount: response.data.accounts?.length || 0
        });
        
        return response.data;
      } else {
        // L'authentification a échoué - vérifier le message d'erreur dans la réponse
        const errorMessage = response.data?.message || 'Authentication failed';
        logger.logAuthAttempt(phoneNumber, false, 'PIN');
        logger.error('Login with PIN failed', { 
          phoneNumber, 
          success: response.data?.success || false,
          message: errorMessage,
          responseData: response.data
        });
        
        return {
          success: false,
          message: errorMessage,
          accounts: []
        };
      }
    } catch (error) {
      logger.logAuthAttempt(phoneNumber, false, 'PIN');
      logger.error('Error logging in with PIN', { phoneNumber, error });
      
      // Retourner une réponse d'échec plutôt que de lancer une exception
      return {
        success: false,
        message: 'Technical error during authentication',
        accounts: []
      };
    }
  }

  /**
   * Obtenir le solde d'un compte
   */
  async getAccountBalance(accountNumber: string): Promise<SoldeDTO> {
    try {
      const token = await this.authService.getValidToken();
      logger.info('Try get account balance', { accountNumber });
      
      const response = await this.httpClient.get<SoldeDTO>(
        `/whatsapp/solde/${accountNumber}`,
        {
          headers: {
            'X-Auth-Token': token
          }
        }
      );

      if (response.data) {
        logger.info('Get account balance successful', { 
          accountNumber, 
          solde: response.data.solde,
          currency: response.data.currency
        });
        
        return response.data;
      } else {
        throw new Error('Invalid balance response');
      }
    } catch (error) {
      logger.error('Error getting account balance', { accountNumber, error });
      throw error;
    }
  }

  /**
   * Obtenir les informations d'un compte
   */
  async getAccountInfo(accountNumber: string): Promise<any> {
    try {
      const token = await this.authService.getValidToken();
      logger.info('Try get account info', { accountNumber });
      
      const response = await this.httpClient.get<any>(
        `/whatsapp/account/${accountNumber}`,
        {
          headers: {
            'X-Auth-Token': token
          }
        }
      );

      if (response.data) {
        logger.info('Get account info successful', { accountNumber });
        return response.data;
      } else {
        throw new Error('Invalid account info response');
      }
    } catch (error) {
      logger.error('Error getting account info', { accountNumber, error });
      throw error;
    }
  }

  /**
   * Obtenir l'historique d'un compte
   */
  async getAccountHistory(accountNumber: string, numberOfTransactions: number = 5): Promise<any> {
    try {
      const token = await this.authService.getValidToken();
      logger.info('Try get account history', { accountNumber, numberOfTransactions });
      
      const response = await this.httpClient.get<any>(
        `/whatsapp/accountHistoric/${accountNumber}/${numberOfTransactions}`,
        {
          headers: {
            'X-Auth-Token': token
          }
        }
      );

      if (response.data) {
        logger.info('Get account history successful', { accountNumber, numberOfTransactions });
        return response.data;
      } else {
        throw new Error('Invalid account history response');
      }
    } catch (error) {
      logger.error('Error getting account history', { accountNumber, error });
      throw error;
    }
  }

  /**
   * Formater les comptes pour l'affichage dans WhatsApp
   */
  formatAccountsForWhatsApp(accounts: AccountNumber[]): string {
    return BankingTemplates.formatAccountsListMessage(accounts);
  }



  /**
   * Formater le solde pour l'affichage
   */
  formatBalanceForWhatsApp(balance: SoldeDTO, accountNumber: string): string {
    return BankingTemplates.formatBalanceMessage(balance, accountNumber);
  }

  /**
   * Créer un message interactif pour la sélection de compte
   */
  createAccountSelectionMessage(accounts: AccountNumber[], action: string): any {
    // Retourner seulement l'interactive, pas le message complet
    const message = BankingTemplates.createAccountSelectionMessage('', accounts, action);
    return message.interactive;
  }

  /**
   * Vérifier si un numéro de téléphone est valide
   */
  isValidPhoneNumber(phoneNumber: string): boolean {
    // Validation basique pour les numéros de téléphone
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber.replace(/\s+/g, ''));
  }

  /**
   * Vérifier si un PIN est valide
   */
  isValidPin(pin: string): boolean {
    // Le PIN doit être composé de 4 à 6 chiffres
    const pinRegex = /^\d{4,6}$/;
    return pinRegex.test(pin);
  }

  /**
   * Valider l'existence d'un compte bénéficiaire
   */
  async validateReceiverAccount(accountNumber: string): Promise<AccountValidationResponse> {
    try {
      const token = await this.authService.getValidToken();
      logger.info('Try validate receiver account', { accountNumber });
      
      const response = await this.httpClient.get<AccountValidationResponse>(
        `/whatsapp/validateAccount/${accountNumber}`,
        {
          headers: {
            'X-Auth-Token': token
          }
        }
      );

      if (response.data) {
        logger.info('Validate receiver account successful', { 
          accountNumber, 
          exists: response.data.accountExists,
          holder: response.data.accountHolder
        });
        
        return response.data;
      } else {
        throw new Error('Invalid validation response');
      }
    } catch (error) {
      logger.error('Error validating receiver account', { accountNumber, error });
      throw error;
    }
  }

  /**
   * Effectuer un transfert intra-bancaire
   */
  async doTransfer(transferRequest: any): Promise<TransferResponse> {
    try {
      const token = await this.authService.getValidToken();
      
      // Log de l'opération bancaire
      logger.logBankingOperation(
        'transfer_attempt',
        transferRequest.senderAccNo,
        transferRequest.amount,
        {
          receiverAccount: transferRequest.receiverAccNo,
          currency: transferRequest.currencyRecAcc,
          benefName: transferRequest.benefName,
          type: transferRequest.type,
          sameCustomer: transferRequest.sameCustomer
        }
      );
      
      logger.info('Try do transfer', {
          senderAccount: transferRequest.senderAccNo,
          receiverAccount: transferRequest.receiverAccNo,
          amount: transferRequest.amount,
          currency: transferRequest.currencyRecAcc,
          benefName: transferRequest.benefName,
          type: transferRequest.type,
          sameCustomer: transferRequest.sameCustomer
        });
      
      const response = await this.httpClient.post<TransferResponse>(
        '/whatsapp/doTransfer',
        transferRequest,
        {
          headers: {
            'X-Auth-Token': token,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data) {
        // Log du résultat du transfert
        logger.logBankingOperation(
          response.data.success ? 'transfer_success' : 'transfer_failed',
          transferRequest.senderAccNo,
          transferRequest.amount,
          {
            receiverAccount: transferRequest.receiverAccNo,
            reference: response.data.trxId,
            message: response.data.returnMsg,
            success: response.data.success
          }
        );
        
        logger.info('Do transfer successful', { 
          success: response.data.success,
          reference: response.data.trxId,
          message: response.data.returnMsg,
          data: response.data,
          senderAccount: transferRequest.senderAccNo,
          receiverAccount: transferRequest.receiverAccNo
        });
        
        return response.data;
      } else {
        throw new Error('Invalid transfer response');
      }
    } catch (error) {
      // Log de l'échec du transfert
      logger.logBankingOperation(
        'transfer_error',
        transferRequest.senderAccNo,
        transferRequest.amount,
        {
          receiverAccount: transferRequest.receiverAccNo,
          error: error instanceof Error ? error.message : String(error)
        }
      );
      
      logger.error('Error doing transfer', { transferRequest, error });
      throw error;
    }
  }

  /**
   * Changer le PIN d'un utilisateur
   */
  async changePin(phoneNumber: string, currentPin: string, newPin: string): Promise<any> {
    try {
      const token = await this.authService.getValidToken();
      logger.info('Try change PIN', { phoneNumber });
      
      const requestBody = {
        phoneNumber,
        oldPin: currentPin,
        newPin: newPin,
        confirmPin: newPin
      };
      
      const response = await this.httpClient.put<any>(
        '/whatsapp/pin',
        requestBody,
        {
          headers: {
            'X-Auth-Token': token,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Vérifier le contenu de la réponse plutôt que le status code
      // car l'API peut renvoyer 200 même en cas d'échec
      if (response.data && response.data.success === true) {
        logger.info('Change PIN successful', { 
          phoneNumber,
          success: response.data.success,
          responseData: response.data
        });
        
        return {
          success: true,
          message: response.data.message || 'PIN changed successfully'
        };
      } else {
        const errorMessage = response.data?.message || 'Failed to change PIN';
        logger.error('Change PIN failed', { 
          phoneNumber, 
          message: errorMessage,
          responseData: response.data 
        });
        
        return {
          success: false,
          message: errorMessage
        };
      }
    } catch (error) {
      logger.error('Error changing PIN', { phoneNumber, error });
      return {
        success: false,
        message: 'Technical error during PIN change'
      };
    }
  }

  /**
   * Initier l'authentification OTP pour un numéro de téléphone
   */
  async initiateOtpAuthentication(phoneNumber: string): Promise<any> {
    try {
      const token = await this.authService.getValidToken();
      logger.info('Try initiate OTP authentication', { phoneNumber });
      
      const response = await this.httpClient.get<any>(
        `/whatsapp/login/${phoneNumber}`,
        {
          headers: {
            'X-Auth-Token': token
          }
        }
      );

      // Vérifier le contenu de la réponse plutôt que le status code
      if (response.data) {
        logger.info('OTP authentication initiated successfully', { phoneNumber, responseData: response.data });
        return response.data;
      } else {
        const errorMessage = 'Failed to initiate OTP authentication - no data in response';
        logger.error(errorMessage, { phoneNumber, response });
        throw new Error(errorMessage);
      }
    } catch (error) {
      logger.error('Error initiating OTP authentication', { phoneNumber, error });
      throw error;
    }
  }

  /**
   * Valider l'OTP pour l'authentification
   */
  async validateOtp(phoneNumber: string, otp: string): Promise<any> {
    try {
      const token = await this.authService.getValidToken();
      logger.info('Try validate OTP', { phoneNumber });
      
      const response = await this.httpClient.get<any>(
        `/whatsapp/validate/login/${phoneNumber}/${otp}`,
        {
          headers: {
            'X-Auth-Token': token
          }
        }
      );

      // Vérifier le contenu de la réponse plutôt que le status code
      // car l'API peut renvoyer 200 même en cas d'échec de validation
      if (response.data && response.data.success === true) {
        logger.info('OTP validation successful', { phoneNumber, responseData: response.data });
        return {
          success: true,
          data: response.data
        };
      } else {
        const errorMessage = response.data?.message || 'Invalid OTP';
        logger.warn('OTP validation failed', { phoneNumber, message: errorMessage, responseData: response.data });
        return {
          success: false,
          message: errorMessage
        };
      }
    } catch (error) {
      logger.error('Error validating OTP', { phoneNumber, error });
      return {
        success: false,
        message: 'OTP validation failed'
      };
    }
  }
}