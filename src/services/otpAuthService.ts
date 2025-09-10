import { config } from '../config';
import { logger } from '../utils/logger';
import axios, { AxiosResponse } from 'axios';
import { BankingAuthService } from './bankingAuthService';

/**
 * Service pour gérer l'authentification OTP
 * Utilise les endpoints de l'API bancaire pour l'envoi et la validation des OTP
 */
export class OtpAuthService {
  private baseUrl: string;
  private authService: BankingAuthService;

  constructor(authService: BankingAuthService | null) {
    this.baseUrl = config.banking.apiUrl;
    this.authService = authService as BankingAuthService;
  }

  /**
   * Envoyer un OTP au numéro de téléphone
   * Utilise l'endpoint GET /whatsapp/login/{phoneNumber}
   */
  async sendOtp(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.authService) {
        return {
          success: false,
          message: 'Service d\'authentification non disponible'
        };
      }
      
      // Obtenir un token valide
      const token = await this.authService.getValidToken();

      const response: AxiosResponse = await axios.get(
        `${this.baseUrl}/whatsapp/login/${phoneNumber}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': token
          },
          timeout: 30000
        }
      );

      logger.info('OTP sent successfully', { 
        phoneNumber, 
        status: response.status 
      });

      return {
        success: true,
        message: 'OTP sent successfully'
      };

    } catch (error: any) {
      logger.error('Failed to send OTP', {
        phoneNumber,
        error: error.response?.data || error.message
      });

      return {
        success: false,
        message: 'Failed to send OTP. Please try again.'
      };
    }
  }

  /**
   * Valider un OTP
   * Utilise l'endpoint GET /whatsapp/v3/validate/login/{phoneNumber}/{otp}
   */
  async validateOtp(phoneNumber: string, otp: string): Promise<{ success: boolean; message: string; accounts?: any[] }> {
    try {
      logger.info('Validating OTP', { phoneNumber, otp: '***' });

      if (!this.authService) {
        return {
          success: false,
          message: 'Service d\'authentification non disponible'
        };
      }

      // Obtenir un token valide
      const token = await this.authService.getValidToken();

      const response: AxiosResponse = await axios.get(
        `${this.baseUrl}/whatsapp/v3/validate/login/${phoneNumber}/${otp}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': token
          },
          timeout: 30000
        }
      );

      // Vérifier le contenu de la réponse plutôt que le status code
      // car l'API peut renvoyer 200 même en cas d'échec
      if (response.data && response.data.returnValue && Array.isArray(response.data.returnValue)) {
        logger.info('OTP validated successfully', { 
          phoneNumber, 
          accountsCount: response.data.returnValue.length,
          responseData: response.data
        });

        return {
          success: true,
          message: 'OTP validated successfully',
          accounts: response.data.returnValue
        };
      } else {
        const errorMessage = response.data?.message || 'Invalid OTP';
        logger.warn('OTP validation failed', { 
          phoneNumber, 
          message: errorMessage,
          responseData: response.data
        });

        return {
          success: false,
          message: 'Invalid OTP. Please try again.'
        };
      }

    } catch (error: any) {
      logger.error('Failed to validate OTP', {
        phoneNumber,
        error: error.response?.data || error.message,
        status: error.response?.status
      });

      // Si le status code n'est pas 200, c'est une validation échouée
      if (error.response?.status && error.response.status !== 200) {
        return {
          success: false,
          message: 'Invalid OTP. Please try again.'
        };
      }

      return {
        success: false,
        message: 'Technical error during OTP validation. Please try again.'
      };
    }
  }

  /**
   * Valider le format d'un OTP
   */
  isValidOtpFormat(otp: string): boolean {
    // L'OTP doit être composé de 4 à 6 chiffres
    const otpRegex = /^\d{4,6}$/;
    return otpRegex.test(otp);
  }
}