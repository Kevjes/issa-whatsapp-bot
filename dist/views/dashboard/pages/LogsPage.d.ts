import { DashboardUser, LogEntry } from '../../../types/dashboard';
export interface LogsPageData {
    user: DashboardUser;
    logs: LogEntry[];
    pagination: {
        page: number;
        limit: number;
        total: number;
    };
    filters: {
        level?: string;
        dateFrom?: string;
        dateTo?: string;
        userId?: string;
        search?: string;
    };
    stats: {
        totalLogs: number;
        errorCount: number;
        warningCount: number;
        infoCount: number;
    };
    analytics: {
        hourlyDistribution: {
            hour: string;
            count: number;
        }[];
        levelDistribution: {
            level: string;
            count: number;
        }[];
    };
}
export declare class LogsPage {
    private data;
    constructor(data: LogsPageData);
    private generateStatsSection;
    private generateAnalyticsSection;
    private generateFiltersSection;
    private generateLogsTableSection;
    private generateMainContent;
    render(): string;
}
export default LogsPage;
//# sourceMappingURL=LogsPage.d.ts.map