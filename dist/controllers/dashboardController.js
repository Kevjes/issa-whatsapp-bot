"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const logger_1 = require("../utils/logger");
class DashboardController {
    constructor(dashboardService, authService) {
        this.dashboardService = dashboardService;
        this.authService = authService;
        this.login = async (req, res) => {
            try {
                const { username, password } = req.body;
                if (!username || !password) {
                    res.status(400).json({
                        success: false,
                        message: 'Nom d\'utilisateur et mot de passe requis',
                        timestamp: new Date().toISOString()
                    });
                    return;
                }
                const result = await this.authService.authenticate(username, password);
                if (result.success) {
                    res.json({
                        success: true,
                        data: {
                            token: result.token,
                            user: result.user,
                            expiresAt: result.expiresAt
                        },
                        timestamp: new Date().toISOString()
                    });
                }
                else {
                    res.status(401).json({
                        success: false,
                        message: result.message || 'Échec de l\'authentification',
                        timestamp: new Date().toISOString()
                    });
                }
            }
            catch (error) {
                logger_1.logger.error('Erreur lors de la connexion dashboard', { error });
                res.status(500).json({
                    success: false,
                    message: 'Erreur interne du serveur',
                    timestamp: new Date().toISOString()
                });
            }
        };
        this.logout = async (req, res) => {
            try {
                const token = req.headers.authorization?.substring(7);
                if (token) {
                    await this.authService.logout(token);
                }
                res.json({
                    success: true,
                    message: 'Déconnexion réussie',
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                logger_1.logger.error('Erreur lors de la déconnexion', { error });
                res.status(500).json({
                    success: false,
                    message: 'Erreur interne du serveur',
                    timestamp: new Date().toISOString()
                });
            }
        };
        this.validateToken = async (req, res) => {
            try {
                const authHeader = req.headers.authorization;
                const token = authHeader?.replace('Bearer ', '');
                if (!token) {
                    res.status(401).json({
                        success: false,
                        message: 'Token manquant',
                        timestamp: new Date().toISOString()
                    });
                    return;
                }
                const result = await this.authService.validateToken(token);
                if (result.valid) {
                    res.json({
                        success: true,
                        message: 'Token valide',
                        timestamp: new Date().toISOString()
                    });
                }
                else {
                    res.status(401).json({
                        success: false,
                        message: 'Token invalide ou expiré',
                        timestamp: new Date().toISOString()
                    });
                }
            }
            catch (error) {
                logger_1.logger.error('Erreur lors de la validation du token', {
                    error: error.message,
                    stack: error.stack
                });
                res.status(500).json({
                    success: false,
                    message: 'Erreur interne du serveur',
                    timestamp: new Date().toISOString()
                });
            }
        };
        this.refreshToken = async (req, res) => {
            try {
                const token = req.headers.authorization?.substring(7);
                if (!token) {
                    res.status(400).json({
                        success: false,
                        message: 'Token requis',
                        timestamp: new Date().toISOString()
                    });
                    return;
                }
                const result = await this.authService.refreshToken(token);
                if (result.success) {
                    res.json({
                        success: true,
                        data: {
                            token: result.newToken,
                            expiresAt: result.expiresAt
                        },
                        timestamp: new Date().toISOString()
                    });
                }
                else {
                    res.status(401).json({
                        success: false,
                        message: 'Impossible de rafraîchir le token',
                        timestamp: new Date().toISOString()
                    });
                }
            }
            catch (error) {
                logger_1.logger.error('Erreur lors du rafraîchissement du token', { error });
                res.status(500).json({
                    success: false,
                    message: 'Erreur interne du serveur',
                    timestamp: new Date().toISOString()
                });
            }
        };
        this.getStats = async (req, res) => {
            try {
                const stats = await this.dashboardService.getDashboardStats();
                res.json({
                    success: true,
                    data: stats,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                logger_1.logger.error('Erreur lors de la récupération des statistiques', { error });
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération des statistiques',
                    timestamp: new Date().toISOString()
                });
            }
        };
        this.getLogAnalytics = async (req, res) => {
            try {
                const filter = this.parseFilter(req.query);
                const analytics = await this.dashboardService.getLogAnalytics(filter);
                res.json({
                    success: true,
                    data: analytics,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                logger_1.logger.error('Erreur lors de l\'analyse des logs', { error });
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de l\'analyse des logs',
                    timestamp: new Date().toISOString()
                });
            }
        };
        this.getSessionAnalytics = async (req, res) => {
            try {
                const filter = this.parseFilter(req.query);
                const analytics = await this.dashboardService.getSessionAnalytics(filter);
                res.json({
                    success: true,
                    data: analytics,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                logger_1.logger.error('Erreur lors de l\'analyse des sessions', { error });
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de l\'analyse des sessions',
                    timestamp: new Date().toISOString()
                });
            }
        };
        this.getSystemHealth = async (req, res) => {
            try {
                const health = await this.dashboardService.getSystemHealth();
                res.json({
                    success: true,
                    data: health,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                logger_1.logger.error('Erreur lors de la vérification de la santé du système', { error });
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la vérification de la santé du système',
                    timestamp: new Date().toISOString()
                });
            }
        };
        this.getTransferAnalytics = async (req, res) => {
            try {
                const filter = this.parseFilter(req.query);
                const analytics = await this.dashboardService.getTransferAnalytics(filter);
                res.json({
                    success: true,
                    data: analytics,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                logger_1.logger.error('Erreur lors de l\'analyse des transferts', { error });
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de l\'analyse des transferts',
                    timestamp: new Date().toISOString()
                });
            }
        };
        this.getUserActivities = async (req, res) => {
            try {
                const params = this.parsePaginationParams(req.query);
                const activities = await this.dashboardService.getUserActivities(params);
                res.json({
                    success: true,
                    data: activities,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                logger_1.logger.error('Erreur lors de la récupération des activités utilisateur', { error });
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération des activités utilisateur',
                    timestamp: new Date().toISOString()
                });
            }
        };
        this.getLogs = async (req, res) => {
            try {
                const params = this.parsePaginationParams(req.query);
                const filter = this.parseFilter(req.query);
                const logs = await this.dashboardService.getLogs(params, filter);
                res.json({
                    success: true,
                    data: logs,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                logger_1.logger.error('Erreur lors de la récupération des logs', { error });
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération des logs',
                    timestamp: new Date().toISOString()
                });
            }
        };
        this.getAlerts = async (req, res) => {
            try {
                const params = this.parsePaginationParams(req.query);
                const alerts = await this.dashboardService.getDashboardAlerts(params);
                res.json({
                    success: true,
                    data: alerts,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                logger_1.logger.error('Erreur lors de la récupération des alertes', { error });
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération des alertes',
                    timestamp: new Date().toISOString()
                });
            }
        };
        this.markAlertAsRead = async (req, res) => {
            try {
                const { alertId } = req.params;
                const success = await this.dashboardService.markAlertAsRead(alertId);
                if (success) {
                    res.json({
                        success: true,
                        message: 'Alerte marquée comme lue',
                        timestamp: new Date().toISOString()
                    });
                }
                else {
                    res.status(404).json({
                        success: false,
                        message: 'Alerte non trouvée',
                        timestamp: new Date().toISOString()
                    });
                }
            }
            catch (error) {
                logger_1.logger.error('Erreur lors du marquage de l\'alerte', { error });
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors du marquage de l\'alerte',
                    timestamp: new Date().toISOString()
                });
            }
        };
        this.cleanupLogs = async (req, res) => {
            try {
                const { days } = req.body;
                const daysToKeep = parseInt(days) || 30;
                const result = await this.dashboardService.cleanupOldLogs(daysToKeep);
                res.json({
                    success: true,
                    data: result,
                    message: `${result.deletedCount} fichiers supprimés`,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                logger_1.logger.error('Erreur lors du nettoyage des logs', { error });
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors du nettoyage des logs',
                    timestamp: new Date().toISOString()
                });
            }
        };
        this.cleanupSessions = async (req, res) => {
            try {
                const result = await this.dashboardService.cleanupExpiredSessions();
                res.json({
                    success: true,
                    data: result,
                    message: `${result.deletedCount} sessions supprimées`,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                logger_1.logger.error('Erreur lors du nettoyage des sessions', { error });
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors du nettoyage des sessions',
                    timestamp: new Date().toISOString()
                });
            }
        };
        this.exportData = async (req, res) => {
            try {
                const { type } = req.params;
                const filter = this.parseFilter(req.query);
                if (!['logs', 'sessions', 'transfers'].includes(type)) {
                    res.status(400).json({
                        success: false,
                        message: 'Type d\'export invalide',
                        timestamp: new Date().toISOString()
                    });
                    return;
                }
                const data = await this.dashboardService.exportData(type, filter);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="${type}_export_${new Date().toISOString().split('T')[0]}.csv"`);
                res.send(data);
            }
            catch (error) {
                logger_1.logger.error('Erreur lors de l\'export des données', { error });
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de l\'export des données',
                    timestamp: new Date().toISOString()
                });
            }
        };
        this.getRealTimeMetrics = async (req, res) => {
            try {
                const metrics = await this.dashboardService.getRealTimeMetrics();
                res.json({
                    success: true,
                    data: metrics,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                logger_1.logger.error('Erreur lors de la récupération des métriques temps réel', { error });
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération des métriques temps réel',
                    timestamp: new Date().toISOString()
                });
            }
        };
        this.getDatabaseStats = async (req, res) => {
            try {
                const stats = await this.dashboardService.getDatabaseStats();
                res.json({
                    success: true,
                    data: stats,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                logger_1.logger.error('Erreur lors de la récupération des statistiques de la base de données', { error });
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération des statistiques de la base de données',
                    timestamp: new Date().toISOString()
                });
            }
        };
    }
    parsePaginationParams(query) {
        return {
            page: parseInt(query.page) || 1,
            limit: Math.min(parseInt(query.limit) || 20, 100),
            sortBy: query.sortBy || 'timestamp',
            sortOrder: query.sortOrder === 'asc' ? 'asc' : 'desc',
            search: query.search || undefined
        };
    }
    parseFilter(query) {
        const filter = {};
        if (query.startDate && query.endDate) {
            filter.dateRange = {
                start: query.startDate,
                end: query.endDate
            };
        }
        if (query.level) {
            filter.level = Array.isArray(query.level) ? query.level : [query.level];
        }
        if (query.source) {
            filter.source = Array.isArray(query.source) ? query.source : [query.source];
        }
        if (query.userId) {
            filter.userId = query.userId;
        }
        if (query.sessionId) {
            filter.sessionId = query.sessionId;
        }
        return filter;
    }
}
exports.DashboardController = DashboardController;
//# sourceMappingURL=dashboardController.js.map