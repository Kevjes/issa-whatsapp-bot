import { config } from '../config';
import { logger } from '../utils/logger';
import { BankingAuthRequest, BankingAuthResponse, TokenRecord, AuthResponse, TokenData } from '../types';
import { IHttpClient } from '../core/interfaces/IHttpClient';
import { IBankingAuthService } from '../core/interfaces/IBankingAuthService';
import { DatabaseService } from './databaseService';

export class BankingAuthService implements IBankingAuthService {
  private httpClient: IHttpClient;
  private databaseService: DatabaseService;
  private currentToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(httpClient: IHttpClient, databaseService: DatabaseService) {
    this.httpClient = httpClient;
    this.databaseService = databaseService;
  }

  /**
   * Initialiser le service d'authentification
   */
  async initialize(): Promise<void> {
    try {
      await this.databaseService.initialize();
      await this.loadTokenFromDatabase();
      
      // Si pas de token valide, en obtenir un nouveau
      if (!this.isTokenValidInternal()) {
        await this.authenticateWithBankingAPI();
      }
      

    } catch (error) {
      logger.error('Error initializing authentication service', { error });
      throw error;
    }
  }

  /**
   * Obtenir un token valide
   */
  async getValidToken(): Promise<string> {
    if (!this.isTokenValidInternal()) {
      await this.authenticateWithBankingAPI();
    }
    
    if (!this.currentToken) {
      throw new Error('Unable to obtain a valid token');
    }
    
    return this.currentToken;
  }

  /**
   * Authentification avec l'API bancaire
   */
  private async authenticateWithBankingAPI(): Promise<void> {
    try {
      const authRequest: BankingAuthRequest = {
        username: config.banking.username,
        password: config.banking.password,
        device: config.banking.device,
        email: config.banking.email
      };

      const response = await this.httpClient.post<BankingAuthResponse>(
        '/auth',
        authRequest
      );

      // Vérifier le contenu de la réponse plutôt que seulement le status code
      // car l'API peut renvoyer 200 même en cas d'erreur d'authentification
      if (response.data && response.data.token) {
        this.currentToken = response.data.token;
        // Les tokens JWT expirent dans 5 minutes
        this.tokenExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
        
        await this.saveTokenToDatabase();
        
        logger.info('Authentication with banking API successful');
      } else {
        // Vérifier s'il y a un message d'erreur dans la réponse
        const errorMessage = response.data?.message || 'Invalid authentication response';
        logger.error('Authentication failed', { 
          message: errorMessage,
          responseData: response.data 
        });
        throw new Error(`Authentication failed: ${errorMessage}`);
      }
    } catch (error) {
      logger.error('Error authenticating with banking API', { error });
      throw error;
    }
  }

  /**
   * Rafraîchir le token (méthode privée)
   */
  private async refreshTokenInternal(): Promise<void> {
    try {
      if (!this.currentToken) {
        await this.authenticateWithBankingAPI();
        return;
      }


      
      const response = await this.httpClient.get<BankingAuthResponse>(
        '/auth/refresh'
      );

      if (response.data && response.data.token) {
        this.currentToken = response.data.token;
        // Les tokens JWT expirent dans 5 minutes
        this.tokenExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
        
        await this.saveTokenToDatabase();
        

      } else {
        // Si le rafraîchissement échoue, obtenir un nouveau token
        await this.authenticateWithBankingAPI();
      }
    } catch (error) {
      logger.error('Error refreshing token', { error });
      // En cas d'erreur, essayer d'obtenir un nouveau token
      await this.authenticateWithBankingAPI();
    }
  }

  /**
   * Invalider le token actuel (forcer un renouvellement)
   */
  async invalidateToken(): Promise<void> {
    this.currentToken = null;
    this.tokenExpiresAt = null;
    logger.info('Token invalidated, a new one will be generated on the next request');
  }

  /**
   * Vérifier si le token actuel est valide (méthode publique)
   */
  async isTokenValid(): Promise<boolean> {
    return this.isTokenValidInternal();
  }

  /**
   * Renouveler le token (méthode publique)
   */
  async refreshToken(): Promise<string> {
    await this.refreshTokenInternal();
    if (!this.currentToken) {
      throw new Error('Unable to refresh token');
    }
    return this.currentToken;
  }

  /**
   * Vérifier si le token actuel est valide (méthode privée)
   */
  private isTokenValidInternal(): boolean {
    if (!this.currentToken || !this.tokenExpiresAt) {
      return false;
    }
    
    // Vérifier si le token expire dans les 5 prochaines minutes
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return this.tokenExpiresAt > fiveMinutesFromNow;
  }

  /**
   * Charger le token depuis la base de données
   */
  private async loadTokenFromDatabase(): Promise<void> {
    try {
      const tokenRecord = await this.databaseService.getLatestToken();
      
      if (tokenRecord && new Date(tokenRecord.expiresAt) > new Date()) {
        this.currentToken = tokenRecord.token;
        this.tokenExpiresAt = new Date(tokenRecord.expiresAt);
        

      }
    } catch (error) {
      logger.error('Error loading token from database', { error });
    }
  }

  /**
   * Save the token to the database
   */
  private async saveTokenToDatabase(): Promise<void> {
    try {
      if (!this.currentToken || !this.tokenExpiresAt) {
        return;
      }
      
      const tokenRecord: TokenRecord = {
        token: this.currentToken,
        expiresAt: this.tokenExpiresAt.toISOString(),
        createdAt: new Date().toISOString()
      };
      
      await this.databaseService.saveToken(tokenRecord);
      

    } catch (error) {
      logger.error('Error saving token to database', { error });
    }
  }

  /**
   * Program the automatic token refresh
   */
  startTokenRefreshScheduler(): void {
    // Refresh the token every 50 minutes
    setInterval(async () => {
      try {
        await this.refreshTokenInternal();
      } catch (error) {
        logger.error('Error refreshing token', { error });
      }
    }, 50 * 60 * 1000);
    

  }
}