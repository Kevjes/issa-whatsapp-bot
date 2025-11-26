import { IDashboardService } from '../core/interfaces/IDashboardService';
import { DashboardStats, LogAnalytics, SessionAnalytics, SystemHealth, TransferAnalytics, UserActivity, DatabaseStats, DashboardAlert, LogEntry, PaginationParams, PaginatedResponse, DashboardFilter } from '../types/dashboard';
import { DatabaseService } from './databaseService';
import { PinSessionService } from './pinSessionService';
import { TransferSessionService } from './transferSessionService';
export declare class DashboardService implements IDashboardService {
    private databaseService;
    private logManagementService;
    private pinSessionService;
    private transferSessionService;
    private alerts;
    constructor(databaseService: DatabaseService, logManagementService: any, pinSessionService: PinSessionService, transferSessionService: TransferSessionService);
    getDashboardStats(): Promise<DashboardStats>;
    getLogAnalytics(filter?: DashboardFilter): Promise<LogAnalytics>;
    getSessionAnalytics(filter?: DashboardFilter): Promise<SessionAnalytics>;
    getSystemHealth(): Promise<SystemHealth>;
    getTransferAnalytics(filter?: DashboardFilter): Promise<TransferAnalytics>;
    getUserActivities(params: PaginationParams): Promise<PaginatedResponse<UserActivity>>;
    getDatabaseStats(): Promise<DatabaseStats>;
    getDashboardAlerts(params: PaginationParams): Promise<PaginatedResponse<DashboardAlert>>;
    getLogs(params: PaginationParams, filter?: DashboardFilter): Promise<PaginatedResponse<LogEntry>>;
    markAlertAsRead(alertId: string): Promise<boolean>;
    cleanupOldLogs(daysToKeep: number): Promise<{
        deletedCount: number;
        sizeFreed: number;
    }>;
    cleanupExpiredSessions(): Promise<{
        deletedCount: number;
    }>;
    exportData(type: 'logs' | 'sessions' | 'transfers', filter?: DashboardFilter): Promise<Buffer>;
    getRealTimeMetrics(): Promise<{
        activeUsers: number;
        activeSessions: number;
        systemLoad: number;
        memoryUsage: number;
    }>;
    createAlert(alert: Omit<DashboardAlert, 'id' | 'timestamp'>): Promise<DashboardAlert>;
    deleteAlert(alertId: string): Promise<boolean>;
    getErrorTrends(days: number): Promise<any[]>;
    getPerformanceMetrics(): Promise<{
        averageResponseTime: number;
        requestsPerMinute: number;
        errorRate: number;
        uptime: number;
    }>;
    private getRecentLogs;
    private calculateErrorTrends;
    private convertToCSV;
}
//# sourceMappingURL=dashboardService.d.ts.map