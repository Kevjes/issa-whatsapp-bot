import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { IDashboardAuthService } from '../core/interfaces/IDashboardAuthService';

// Étendre l'interface Request pour inclure les informations utilisateur
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        role: string;
      };
      session?: {
        id: string;
        token: string;
      };
    }
  }
}

/**
 * Middleware d'authentification pour le dashboard
 */
export class DashboardAuthMiddleware {
  constructor(private authService: IDashboardAuthService) {
    logger.info('DashboardAuthMiddleware constructor', {
      authService: !!authService,
      authServiceType: typeof authService
    });
    
    if (!authService) {
      throw new Error('AuthService is null in DashboardAuthMiddleware constructor');
    }
  }

  /**
   * Middleware pour vérifier l'authentification
   */
  authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          message: 'Token d\'authentification requis'
        });
        return;
      }

      const token = authHeader.substring(7); // Supprimer 'Bearer '
      
      const validation = await this.authService.validateToken(token);
      
      if (!validation.valid || !validation.user || !validation.session) {
        res.status(401).json({
          success: false,
          message: 'Token invalide ou expiré'
        });
        return;
      }

      // Ajouter les informations utilisateur à la requête
      req.user = {
        id: validation.user.id,
        username: validation.user.username,
        role: validation.user.role
      };

      req.session = {
        id: validation.session.id,
        token: validation.session.token
      };

      // Enregistrer l'activité
      await this.authService.logLoginActivity(
        validation.user.id,
        req.ip,
        req.get('User-Agent')
      );

      next();
    } catch (error) {
      logger.error('Erreur lors de l\'authentification dashboard', { error });
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  };

  /**
   * Middleware pour vérifier les permissions
   */
  requirePermission = (permission: string) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          res.status(401).json({
            success: false,
            message: 'Authentification requise'
          });
          return;
        }

        const hasPermission = await this.authService.checkPermission(req.user.id, permission);
        
        if (!hasPermission) {
          res.status(403).json({
            success: false,
            message: 'Permissions insuffisantes'
          });
          return;
        }

        next();
      } catch (error) {
        logger.error('Erreur lors de la vérification des permissions', { error, permission });
        res.status(500).json({
          success: false,
          message: 'Erreur interne du serveur'
        });
      }
    };
  };

  /**
   * Middleware pour vérifier le rôle admin
   */
  requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentification requise'
        });
        return;
      }

      if (req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Accès réservé aux administrateurs'
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Erreur lors de la vérification du rôle admin', { error });
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  };

  /**
   * Middleware optionnel pour les routes publiques du dashboard
   */
  optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const validation = await this.authService.validateToken(token);
        
        if (validation.valid && validation.user && validation.session) {
          req.user = {
            id: validation.user.id,
            username: validation.user.username,
            role: validation.user.role
          };

          req.session = {
            id: validation.session.id,
            token: validation.session.token
          };
        }
      }

      next();
    } catch (error) {
      logger.error('Erreur lors de l\'authentification optionnelle', { error });
      // Continuer même en cas d'erreur pour les routes publiques
      next();
    }
  };
}

/**
 * Factory function pour créer le middleware d'authentification
 */
export const createDashboardAuthMiddleware = (authService: IDashboardAuthService) => {
  logger.info('Creating dashboard auth middleware', {
    authService: !!authService,
    authServiceType: typeof authService,
    authServiceMethods: authService ? Object.getOwnPropertyNames(Object.getPrototypeOf(authService)) : 'null'
  });
  
  if (!authService) {
    throw new Error('AuthService is null in createDashboardAuthMiddleware');
  }
  
  return new DashboardAuthMiddleware(authService);
};