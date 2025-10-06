import { Request, Response } from 'express';
import { IDashboardService } from '../core/interfaces/IDashboardService';
import { IDashboardAuthService } from '../core/interfaces/IDashboardAuthService';
export declare class DashboardController {
    private dashboardService;
    private authService;
    constructor(dashboardService: IDashboardService, authService: IDashboardAuthService);
    login: (req: Request, res: Response) => Promise<void>;
    logout: (req: Request, res: Response) => Promise<void>;
    validateToken: (req: Request, res: Response) => Promise<void>;
    refreshToken: (req: Request, res: Response) => Promise<void>;
    getStats: (req: Request, res: Response) => Promise<void>;
    getLogAnalytics: (req: Request, res: Response) => Promise<void>;
    getSessionAnalytics: (req: Request, res: Response) => Promise<void>;
    getSystemHealth: (req: Request, res: Response) => Promise<void>;
    getTransferAnalytics: (req: Request, res: Response) => Promise<void>;
    getUserActivities: (req: Request, res: Response) => Promise<void>;
    getLogs: (req: Request, res: Response) => Promise<void>;
    getAlerts: (req: Request, res: Response) => Promise<void>;
    markAlertAsRead: (req: Request, res: Response) => Promise<void>;
    cleanupLogs: (req: Request, res: Response) => Promise<void>;
    cleanupSessions: (req: Request, res: Response) => Promise<void>;
    exportData: (req: Request, res: Response) => Promise<void>;
    getRealTimeMetrics: (req: Request, res: Response) => Promise<void>;
    getDatabaseStats: (req: Request, res: Response) => Promise<void>;
    private parsePaginationParams;
    private parseFilter;
}
//# sourceMappingURL=dashboardController.d.ts.map