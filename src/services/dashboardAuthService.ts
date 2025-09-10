import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { IDashboardAuthService } from '../core/interfaces/IDashboardAuthService';
import { DashboardUser, DashboardSession } from '../types/dashboard';
import { DatabaseService } from './databaseService';

/**
 * Service d'authentification pour le dashboard administratif
 */
export class DashboardAuthService implements IDashboardAuthService {
  private activeSessions: Map<string, DashboardSession> = new Map();
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 heures

  constructor(private databaseService: DatabaseService) {
    // Nettoyer les sessions expirées toutes les heures
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60 * 60 * 1000);
  }

  /**
   * Authentifier un utilisateur admin
   */
  async authenticate(username: string, password: string): Promise<{
    success: boolean;
    token?: string;
    user?: DashboardUser;
    expiresAt?: string;
    message?: string;
  }> {
    try {
      // Vérifier les credentials depuis les variables d'environnement
      const adminUsername = process.env.DASHBOARD_ADMIN_USERNAME;
      const adminPassword = process.env.DASHBOARD_ADMIN_PASSWORD;

      if (!adminUsername || !adminPassword) {
        logger.error('Dashboard admin credentials not configured');
        return {
          success: false,
          message: 'Configuration error'
        };
      }

      if (username !== adminUsername || password !== adminPassword) {
        logger.warn('Failed dashboard login attempt', { username });
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      // Créer l'utilisateur admin
      const user: DashboardUser = {
        id: 'admin',
        username: adminUsername,
        role: 'admin',
        lastLogin: new Date().toISOString(),
        isActive: true
      };

      // Créer une session
      const token = uuidv4();
      const expiresAt = new Date(Date.now() + this.SESSION_DURATION).toISOString();
      
      const session: DashboardSession = {
        id: uuidv4(),
        userId: user.id,
        token,
        expiresAt,
        createdAt: new Date().toISOString()
      };

      this.activeSessions.set(token, session);
      
      logger.info('Dashboard session created', {
        sessionId: session.id,
        token: token.substring(0, 10) + '...',
        expiresAt,
        activeSessionsCount: this.activeSessions.size
      });

      logger.info('Dashboard admin authenticated successfully', { username });

      return {
        success: true,
        token,
        user,
        expiresAt
      };
    } catch (error) {
      logger.error('Error during dashboard authentication', { error, username });
      return {
        success: false,
        message: 'Authentication error'
      };
    }
  }

  /**
   * Valider un token de session
   */
  async validateToken(token: string): Promise<{
    valid: boolean;
    user?: DashboardUser;
    session?: DashboardSession;
  }> {
    try {
      logger.info('Validating dashboard token', { 
        token: token ? token.substring(0, 10) + '...' : 'null',
        activeSessionsCount: this.activeSessions.size,
        activeSessions: Array.from(this.activeSessions.keys()).map(k => k.substring(0, 10) + '...')
      });
      
      const session = this.activeSessions.get(token);
      
      if (!session) {
        logger.warn('Session not found for token', { 
          token: token ? token.substring(0, 10) + '...' : 'null'
        });
        return { valid: false };
      }

      // Vérifier l'expiration
      if (new Date(session.expiresAt) <= new Date()) {
        logger.info('Session expired, removing', { sessionId: session.id });
        this.activeSessions.delete(token);
        return { valid: false };
      }

      // Créer l'utilisateur admin
      const user: DashboardUser = {
        id: 'admin',
        username: process.env.DASHBOARD_ADMIN_USERNAME || 'admin',
        role: 'admin',
        lastLogin: session.createdAt,
        isActive: true
      };

      return {
        valid: true,
        user,
        session
      };
    } catch (error) {
      logger.error('Error validating dashboard token', { error });
      return { valid: false };
    }
  }

  /**
   * Rafraîchir un token de session
   */
  async refreshToken(token: string): Promise<{
    success: boolean;
    newToken?: string;
    expiresAt?: string;
  }> {
    try {
      const validation = await this.validateToken(token);
      
      if (!validation.valid || !validation.session) {
        return { success: false };
      }

      // Supprimer l'ancien token
      this.activeSessions.delete(token);

      // Créer un nouveau token
      const newToken = uuidv4();
      const expiresAt = new Date(Date.now() + this.SESSION_DURATION).toISOString();
      
      const newSession: DashboardSession = {
        ...validation.session,
        token: newToken,
        expiresAt
      };

      this.activeSessions.set(newToken, newSession);

      return {
        success: true,
        newToken,
        expiresAt
      };
    } catch (error) {
      logger.error('Error refreshing dashboard token', { error });
      return { success: false };
    }
  }

  /**
   * Déconnecter un utilisateur
   */
  async logout(token: string): Promise<boolean> {
    try {
      const deleted = this.activeSessions.delete(token);
      if (deleted) {
        logger.info('Dashboard user logged out');
      }
      return deleted;
    } catch (error) {
      logger.error('Error during dashboard logout', { error });
      return false;
    }
  }

  /**
   * Obtenir les sessions actives
   */
  async getActiveSessions(): Promise<DashboardSession[]> {
    try {
      return Array.from(this.activeSessions.values());
    } catch (error) {
      logger.error('Error getting active dashboard sessions', { error });
      return [];
    }
  }

  /**
   * Révoquer une session
   */
  async revokeSession(sessionId: string): Promise<boolean> {
    try {
      for (const [token, session] of this.activeSessions.entries()) {
        if (session.id === sessionId) {
          this.activeSessions.delete(token);
          logger.info('Dashboard session revoked', { sessionId });
          return true;
        }
      }
      return false;
    } catch (error) {
      logger.error('Error revoking dashboard session', { error, sessionId });
      return false;
    }
  }

  /**
   * Nettoyer les sessions expirées
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const now = new Date();
      let cleanedCount = 0;

      for (const [token, session] of this.activeSessions.entries()) {
        if (new Date(session.expiresAt) <= now) {
          this.activeSessions.delete(token);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.info('Expired dashboard sessions cleaned', { count: cleanedCount });
      }

      return cleanedCount;
    } catch (error) {
      logger.error('Error cleaning up expired dashboard sessions', { error });
      return 0;
    }
  }

  /**
   * Obtenir les informations d'un utilisateur par token
   */
  async getUserByToken(token: string): Promise<DashboardUser | null> {
    try {
      const validation = await this.validateToken(token);
      return validation.valid ? validation.user || null : null;
    } catch (error) {
      logger.error('Error getting user by token', { error });
      return null;
    }
  }

  /**
   * Vérifier les permissions d'un utilisateur
   */
  async checkPermission(userId: string, permission: string): Promise<boolean> {
    try {
      // Pour l'admin, toutes les permissions sont accordées
      return userId === 'admin';
    } catch (error) {
      logger.error('Error checking dashboard permission', { error, userId, permission });
      return false;
    }
  }

  /**
   * Enregistrer l'activité de connexion
   */
  async logLoginActivity(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      logger.info('Dashboard login activity', {
        userId,
        ipAddress,
        userAgent,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error logging dashboard login activity', { error });
    }
  }
}