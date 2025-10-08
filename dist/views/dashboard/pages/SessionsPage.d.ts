import { DashboardUser } from '../../../types/dashboard';
import { PinSession, TransferSession } from '../../../types';
export interface SessionsPageData {
    user: DashboardUser;
    sessions: (PinSession | TransferSession)[];
    pagination: {
        page: number;
        limit: number;
        total: number;
    };
    filters: {
        type?: string;
        status?: string;
        dateFrom?: string;
        dateTo?: string;
        userId?: string;
    };
    stats: {
        totalSessions: number;
        activeSessions: number;
        completedSessions: number;
        expiredSessions: number;
        pinSessions: number;
        transferSessions: number;
    };
    analytics: {
        sessionsByHour: {
            hour: string;
            count: number;
        }[];
        sessionsByType: {
            type: string;
            count: number;
        }[];
        sessionsByStatus: {
            status: string;
            count: number;
        }[];
        averageSessionDuration: number;
    };
}
export declare class SessionsPage {
    private data;
    constructor(data: SessionsPageData);
    private generateStatsSection;
    private generateAnalyticsSection;
    private generateFiltersSection;
    private generateSessionsTableSection;
    private generateMainContent;
    render(): string;
}
export default SessionsPage;
//# sourceMappingURL=SessionsPage.d.ts.map