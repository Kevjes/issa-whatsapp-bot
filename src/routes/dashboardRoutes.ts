import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { createDashboardAuthMiddleware } from '../middlewares/dashboardAuth';
import { IDashboardService } from '../core/interfaces/IDashboardService';
import { IDashboardAuthService } from '../core/interfaces/IDashboardAuthService';
import { logger } from '../utils/logger';

/**
 * Routes pour le dashboard administratif
 */
export const createDashboardRoutes = (
  dashboardService: IDashboardService,
  authService: IDashboardAuthService
): Router => {
  logger.info('Creating dashboard routes', {
    dashboardService: !!dashboardService,
    authService: !!authService,
    authServiceType: typeof authService
  });
  
  if (!authService) {
    throw new Error('AuthService is null or undefined');
  }
  
  const router = Router();
  const controller = new DashboardController(dashboardService, authService);
  const authMiddleware = createDashboardAuthMiddleware(authService);
  
  logger.info('Dashboard controller and middleware created successfully');

  // Routes d'authentification (publiques)
  router.post('/auth/login', controller.login);
  router.post('/auth/logout', authMiddleware.optionalAuth, controller.logout);
  router.post('/auth/refresh', controller.refreshToken);
  router.post('/auth/validate', controller.validateToken);

  // Middleware d'authentification pour toutes les routes suivantes
  router.use(authMiddleware.authenticate);

  // Routes des statistiques générales
  router.get('/stats', controller.getStats);
  router.get('/health', controller.getSystemHealth);
  router.get('/metrics/realtime', controller.getRealTimeMetrics);
  router.get('/database/stats', controller.getDatabaseStats);

  // Routes d'analyse
  router.get('/analytics/logs', controller.getLogAnalytics);
  router.get('/analytics/sessions', controller.getSessionAnalytics);
  router.get('/analytics/transfers', controller.getTransferAnalytics);

  // Routes de gestion des logs
  router.get('/logs', controller.getLogs);
  router.post('/logs/cleanup', authMiddleware.requireAdmin, controller.cleanupLogs);

  // Routes de gestion des sessions
  router.post('/sessions/cleanup', authMiddleware.requireAdmin, controller.cleanupSessions);

  // Routes des alertes
  router.get('/alerts', controller.getAlerts);
  router.patch('/alerts/:alertId/read', controller.markAlertAsRead);

  // Routes des activités utilisateur
  router.get('/users/activities', controller.getUserActivities);

  // Routes d'export
  router.get('/export/:type', controller.exportData);

  // Route de test pour vérifier l'authentification
  router.get('/test', (req, res) => {
    res.json({
      success: true,
      message: 'Dashboard API accessible',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  });

  // Middleware de gestion d'erreurs spécifique au dashboard
  router.use((error: any, req: any, res: any, next: any) => {
    logger.error('Erreur dans les routes dashboard', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      user: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      timestamp: new Date().toISOString()
    });
  });

  return router;
};

export default createDashboardRoutes;