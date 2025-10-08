import { DashboardUser, DashboardSession } from '../../types/dashboard';
export interface IDashboardAuthService {
    authenticate(username: string, password: string): Promise<{
        success: boolean;
        token?: string;
        user?: DashboardUser;
        expiresAt?: string;
        message?: string;
    }>;
    validateToken(token: string): Promise<{
        valid: boolean;
        user?: DashboardUser;
        session?: DashboardSession;
    }>;
    refreshToken(token: string): Promise<{
        success: boolean;
        newToken?: string;
        expiresAt?: string;
    }>;
    logout(token: string): Promise<boolean>;
    getActiveSessions(): Promise<DashboardSession[]>;
    revokeSession(sessionId: string): Promise<boolean>;
    cleanupExpiredSessions(): Promise<number>;
    getUserByToken(token: string): Promise<DashboardUser | null>;
    checkPermission(userId: string, permission: string): Promise<boolean>;
    logLoginActivity(userId: string, ipAddress?: string, userAgent?: string): Promise<void>;
}
//# sourceMappingURL=IDashboardAuthService.d.ts.map