import { DashboardUser, DashboardStats, LogAnalytics, SessionAnalytics, TransferAnalytics, SystemHealth } from '../../../types/dashboard';
export interface DashboardPageData {
    user: DashboardUser;
    stats: DashboardStats;
    logAnalytics: LogAnalytics;
    sessionAnalytics: SessionAnalytics;
    transferAnalytics: TransferAnalytics;
    systemHealth: SystemHealth;
    recentLogs: any[];
    activeSessions: any[];
    recentTransfers: any[];
}
export declare class DashboardPage {
    private data;
    constructor(data: DashboardPageData);
    private generateStatsSection;
    private generateChartsSection;
    private generateTablesSection;
    private generateAlertsSection;
    private generateMainContent;
    render(): string;
}
export default DashboardPage;
//# sourceMappingURL=DashboardPage.d.ts.map