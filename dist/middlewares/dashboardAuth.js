"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDashboardAuthMiddleware = exports.DashboardAuthMiddleware = void 0;
const logger_1 = require("../utils/logger");
class DashboardAuthMiddleware {
    constructor(authService) {
        this.authService = authService;
        this.authenticate = async (req, res, next) => {
            try {
                const authHeader = req.headers.authorization;
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    res.status(401).json({
                        success: false,
                        message: 'Token d\'authentification requis'
                    });
                    return;
                }
                const token = authHeader.substring(7);
                const validation = await this.authService.validateToken(token);
                if (!validation.valid || !validation.user || !validation.session) {
                    res.status(401).json({
                        success: false,
                        message: 'Token invalide ou expiré'
                    });
                    return;
                }
                req.user = {
                    id: validation.user.id,
                    username: validation.user.username,
                    role: validation.user.role
                };
                req.session = {
                    id: validation.session.id,
                    token: validation.session.token
                };
                await this.authService.logLoginActivity(validation.user.id, req.ip, req.get('User-Agent'));
                next();
            }
            catch (error) {
                logger_1.logger.error('Erreur lors de l\'authentification dashboard', { error });
                res.status(500).json({
                    success: false,
                    message: 'Erreur interne du serveur'
                });
            }
        };
        this.requirePermission = (permission) => {
            return async (req, res, next) => {
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
                }
                catch (error) {
                    logger_1.logger.error('Erreur lors de la vérification des permissions', { error, permission });
                    res.status(500).json({
                        success: false,
                        message: 'Erreur interne du serveur'
                    });
                }
            };
        };
        this.requireAdmin = async (req, res, next) => {
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
            }
            catch (error) {
                logger_1.logger.error('Erreur lors de la vérification du rôle admin', { error });
                res.status(500).json({
                    success: false,
                    message: 'Erreur interne du serveur'
                });
            }
        };
        this.optionalAuth = async (req, res, next) => {
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
            }
            catch (error) {
                logger_1.logger.error('Erreur lors de l\'authentification optionnelle', { error });
                next();
            }
        };
        logger_1.logger.info('DashboardAuthMiddleware constructor', {
            authService: !!authService,
            authServiceType: typeof authService
        });
        if (!authService) {
            throw new Error('AuthService is null in DashboardAuthMiddleware constructor');
        }
    }
}
exports.DashboardAuthMiddleware = DashboardAuthMiddleware;
const createDashboardAuthMiddleware = (authService) => {
    logger_1.logger.info('Creating dashboard auth middleware', {
        authService: !!authService,
        authServiceType: typeof authService,
        authServiceMethods: authService ? Object.getOwnPropertyNames(Object.getPrototypeOf(authService)) : 'null'
    });
    if (!authService) {
        throw new Error('AuthService is null in createDashboardAuthMiddleware');
    }
    return new DashboardAuthMiddleware(authService);
};
exports.createDashboardAuthMiddleware = createDashboardAuthMiddleware;
//# sourceMappingURL=dashboardAuth.js.map