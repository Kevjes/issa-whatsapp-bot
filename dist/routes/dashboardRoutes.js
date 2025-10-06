"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDashboardRoutes = void 0;
const express_1 = require("express");
const dashboardController_1 = require("../controllers/dashboardController");
const dashboardAuth_1 = require("../middlewares/dashboardAuth");
const logger_1 = require("../utils/logger");
const createDashboardRoutes = (dashboardService, authService) => {
    logger_1.logger.info('Creating dashboard routes', {
        dashboardService: !!dashboardService,
        authService: !!authService,
        authServiceType: typeof authService
    });
    if (!authService) {
        throw new Error('AuthService is null or undefined');
    }
    const router = (0, express_1.Router)();
    const controller = new dashboardController_1.DashboardController(dashboardService, authService);
    const authMiddleware = (0, dashboardAuth_1.createDashboardAuthMiddleware)(authService);
    logger_1.logger.info('Dashboard controller and middleware created successfully');
    router.post('/auth/login', controller.login);
    router.post('/auth/logout', authMiddleware.optionalAuth, controller.logout);
    router.post('/auth/refresh', controller.refreshToken);
    router.post('/auth/validate', controller.validateToken);
    router.use(authMiddleware.authenticate);
    router.get('/stats', controller.getStats);
    router.get('/health', controller.getSystemHealth);
    router.get('/metrics/realtime', controller.getRealTimeMetrics);
    router.get('/database/stats', controller.getDatabaseStats);
    router.get('/analytics/logs', controller.getLogAnalytics);
    router.get('/analytics/sessions', controller.getSessionAnalytics);
    router.get('/analytics/transfers', controller.getTransferAnalytics);
    router.get('/logs', controller.getLogs);
    router.post('/logs/cleanup', authMiddleware.requireAdmin, controller.cleanupLogs);
    router.post('/sessions/cleanup', authMiddleware.requireAdmin, controller.cleanupSessions);
    router.get('/alerts', controller.getAlerts);
    router.patch('/alerts/:alertId/read', controller.markAlertAsRead);
    router.get('/users/activities', controller.getUserActivities);
    router.get('/export/:type', controller.exportData);
    router.get('/test', (req, res) => {
        res.json({
            success: true,
            message: 'Dashboard API accessible',
            user: req.user,
            timestamp: new Date().toISOString()
        });
    });
    router.use((error, req, res, next) => {
        logger_1.logger.error('Erreur dans les routes dashboard', {
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
exports.createDashboardRoutes = createDashboardRoutes;
exports.default = exports.createDashboardRoutes;
//# sourceMappingURL=dashboardRoutes.js.map