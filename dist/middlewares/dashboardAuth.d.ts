import { Request, Response, NextFunction } from 'express';
import { IDashboardAuthService } from '../core/interfaces/IDashboardAuthService';
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                username: string;
                role: string;
            };
            session?: {
                id: string;
                token: string;
            };
        }
    }
}
export declare class DashboardAuthMiddleware {
    private authService;
    constructor(authService: IDashboardAuthService);
    authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    requirePermission: (permission: string) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
    requireAdmin: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const createDashboardAuthMiddleware: (authService: IDashboardAuthService) => DashboardAuthMiddleware;
//# sourceMappingURL=dashboardAuth.d.ts.map