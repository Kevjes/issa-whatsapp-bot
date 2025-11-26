import { DashboardStats, LogAnalytics, SessionAnalytics, SystemHealth, TransferAnalytics, UserActivity, DatabaseStats, DashboardAlert, LogEntry, PaginationParams, PaginatedResponse, DashboardFilter } from '../../types/dashboard';
export interface IDashboardService {
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
}
//# sourceMappingURL=IDashboardService.d.ts.map