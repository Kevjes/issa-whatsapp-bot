import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types';
export declare const validateWhatsAppWebhook: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateWebhookVerification: (req: Request, res: Response, _next: NextFunction) => void;
export declare const errorHandler: (error: unknown, req: Request, res: Response, _next: NextFunction) => void;
export declare const requestLogger: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateHeaders: (req: Request, res: Response, next: NextFunction) => void;
export declare const createApiError: (message: string, statusCode: number, code?: string) => ApiError;
//# sourceMappingURL=validation.d.ts.map