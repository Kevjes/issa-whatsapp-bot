export interface DashboardUser {
    id: string;
    username: string;
    role: 'admin' | 'viewer';
    lastLogin?: string;
    isActive: boolean;
}
export interface DashboardSession {
    id: string;
    userId: string;
    token: string;
    expiresAt: string;
    createdAt: string;
    ipAddress?: string;
    userAgent?: string;
}
export interface DashboardStats {
    totalSessions: number;
    activeSessions: number;
    totalMessages: number;
    totalErrors: number;
    totalTransfers: number;
    successfulTransfers: number;
    failedTransfers: number;
    systemUptime: number;
}
export interface LogAnalytics {
    totalLogs: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    debugCount: number;
    recentErrors: LogEntry[];
    errorTrends: ErrorTrend[];
}
export interface ErrorTrend {
    date: string;
    count: number;
    level: 'error' | 'warn';
}
export interface SessionAnalytics {
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
    averageSessionDuration: number;
    sessionsByHour: SessionHourly[];
}
export interface SessionHourly {
    hour: number;
    count: number;
    date: string;
}
export interface SystemHealth {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    memoryUsage: {
        used: number;
        total: number;
        percentage: number;
    };
    cpuUsage: number;
    diskUsage: {
        used: number;
        total: number;
        percentage: number;
    };
    services: ServiceHealth[];
}
export interface ServiceHealth {
    name: string;
    status: 'healthy' | 'unhealthy';
    lastCheck: string;
    responseTime?: number;
}
export interface DashboardConfig {
    refreshInterval: number;
    maxLogEntries: number;
    retentionDays: number;
    alertThresholds: {
        errorRate: number;
        memoryUsage: number;
        diskUsage: number;
    };
}
export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}
export interface DashboardAlert {
    id: string;
    type: 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: string;
    isRead: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
}
export interface TransferAnalytics {
    totalTransfers: number;
    successfulTransfers: number;
    failedTransfers: number;
    totalAmount: number;
    averageAmount: number;
    transfersByDay: TransferDaily[];
    topCurrencies: CurrencyStats[];
}
export interface TransferDaily {
    date: string;
    count: number;
    amount: number;
    successRate: number;
}
export interface CurrencyStats {
    currency: string;
    count: number;
    totalAmount: number;
    percentage: number;
}
export interface UserActivity {
    phoneNumber: string;
    lastActivity: string;
    totalSessions: number;
    totalTransfers: number;
    totalAmount: number;
    status: 'active' | 'inactive';
}
export interface DatabaseStats {
    totalRecords: number;
    tableStats: TableStats[];
    databaseSize: number;
    lastBackup?: string;
}
export interface TableStats {
    tableName: string;
    recordCount: number;
    sizeBytes: number;
}
export interface LogEntry {
    id?: string;
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    metadata?: any;
    source?: string;
    userId?: string;
    sessionId?: string;
}
export interface DashboardMenuItem {
    id: string;
    label: string;
    icon: string;
    path: string;
    children?: DashboardMenuItem[];
    permissions?: string[];
}
export interface ChartData {
    labels: string[];
    datasets: ChartDataset[];
}
export interface ChartDataset {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
    tension?: number;
    yAxisID?: string;
}
export interface DashboardWidget {
    id: string;
    title: string;
    type: 'chart' | 'stat' | 'table' | 'alert';
    size: 'small' | 'medium' | 'large';
    data: any;
    refreshInterval?: number;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    timestamp: string;
}
export interface DashboardFilter {
    dateRange?: {
        start: string;
        end: string;
    };
    level?: string[];
    source?: string[];
    userId?: string;
    sessionId?: string;
    search?: string;
}
//# sourceMappingURL=dashboard.d.ts.map