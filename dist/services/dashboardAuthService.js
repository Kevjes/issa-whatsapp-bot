"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardAuthService = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("../utils/logger");
class DashboardAuthService {
    constructor(databaseService) {
        this.databaseService = databaseService;
        this.activeSessions = new Map();
        this.SESSION_DURATION = 24 * 60 * 60 * 1000;
        setInterval(() => {
            this.cleanupExpiredSessions();
        }, 60 * 60 * 1000);
    }
    async authenticate(username, password) {
        try {
            const adminUsername = process.env.DASHBOARD_ADMIN_USERNAME;
            const adminPassword = process.env.DASHBOARD_ADMIN_PASSWORD;
            if (!adminUsername || !adminPassword) {
                logger_1.logger.error('Dashboard admin credentials not configured');
                return {
                    success: false,
                    message: 'Configuration error'
                };
            }
            if (username !== adminUsername || password !== adminPassword) {
                logger_1.logger.warn('Failed dashboard login attempt', { username });
                return {
                    success: false,
                    message: 'Invalid credentials'
                };
            }
            const user = {
                id: 'admin',
                username: adminUsername,
                role: 'admin',
                lastLogin: new Date().toISOString(),
                isActive: true
            };
            const token = (0, uuid_1.v4)();
            const expiresAt = new Date(Date.now() + this.SESSION_DURATION).toISOString();
            const session = {
                id: (0, uuid_1.v4)(),
                userId: user.id,
                token,
                expiresAt,
                createdAt: new Date().toISOString()
            };
            this.activeSessions.set(token, session);
            logger_1.logger.info('Dashboard session created', {
                sessionId: session.id,
                token: token.substring(0, 10) + '...',
                expiresAt,
                activeSessionsCount: this.activeSessions.size
            });
            logger_1.logger.info('Dashboard admin authenticated successfully', { username });
            return {
                success: true,
                token,
                user,
                expiresAt
            };
        }
        catch (error) {
            logger_1.logger.error('Error during dashboard authentication', { error, username });
            return {
                success: false,
                message: 'Authentication error'
            };
        }
    }
    async validateToken(token) {
        try {
            logger_1.logger.info('Validating dashboard token', {
                token: token ? token.substring(0, 10) + '...' : 'null',
                activeSessionsCount: this.activeSessions.size,
                activeSessions: Array.from(this.activeSessions.keys()).map(k => k.substring(0, 10) + '...')
            });
            const session = this.activeSessions.get(token);
            if (!session) {
                logger_1.logger.warn('Session not found for token', {
                    token: token ? token.substring(0, 10) + '...' : 'null'
                });
                return { valid: false };
            }
            if (new Date(session.expiresAt) <= new Date()) {
                logger_1.logger.info('Session expired, removing', { sessionId: session.id });
                this.activeSessions.delete(token);
                return { valid: false };
            }
            const user = {
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
        }
        catch (error) {
            logger_1.logger.error('Error validating dashboard token', { error });
            return { valid: false };
        }
    }
    async refreshToken(token) {
        try {
            const validation = await this.validateToken(token);
            if (!validation.valid || !validation.session) {
                return { success: false };
            }
            this.activeSessions.delete(token);
            const newToken = (0, uuid_1.v4)();
            const expiresAt = new Date(Date.now() + this.SESSION_DURATION).toISOString();
            const newSession = {
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
        }
        catch (error) {
            logger_1.logger.error('Error refreshing dashboard token', { error });
            return { success: false };
        }
    }
    async logout(token) {
        try {
            const deleted = this.activeSessions.delete(token);
            if (deleted) {
                logger_1.logger.info('Dashboard user logged out');
            }
            return deleted;
        }
        catch (error) {
            logger_1.logger.error('Error during dashboard logout', { error });
            return false;
        }
    }
    async getActiveSessions() {
        try {
            return Array.from(this.activeSessions.values());
        }
        catch (error) {
            logger_1.logger.error('Error getting active dashboard sessions', { error });
            return [];
        }
    }
    async revokeSession(sessionId) {
        try {
            for (const [token, session] of this.activeSessions.entries()) {
                if (session.id === sessionId) {
                    this.activeSessions.delete(token);
                    logger_1.logger.info('Dashboard session revoked', { sessionId });
                    return true;
                }
            }
            return false;
        }
        catch (error) {
            logger_1.logger.error('Error revoking dashboard session', { error, sessionId });
            return false;
        }
    }
    async cleanupExpiredSessions() {
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
                logger_1.logger.info('Expired dashboard sessions cleaned', { count: cleanedCount });
            }
            return cleanedCount;
        }
        catch (error) {
            logger_1.logger.error('Error cleaning up expired dashboard sessions', { error });
            return 0;
        }
    }
    async getUserByToken(token) {
        try {
            const validation = await this.validateToken(token);
            return validation.valid ? validation.user || null : null;
        }
        catch (error) {
            logger_1.logger.error('Error getting user by token', { error });
            return null;
        }
    }
    async checkPermission(userId, permission) {
        try {
            return userId === 'admin';
        }
        catch (error) {
            logger_1.logger.error('Error checking dashboard permission', { error, userId, permission });
            return false;
        }
    }
    async logLoginActivity(userId, ipAddress, userAgent) {
        try {
            logger_1.logger.info('Dashboard login activity', {
                userId,
                ipAddress,
                userAgent,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            logger_1.logger.error('Error logging dashboard login activity', { error });
        }
    }
}
exports.DashboardAuthService = DashboardAuthService;
//# sourceMappingURL=dashboardAuthService.js.map