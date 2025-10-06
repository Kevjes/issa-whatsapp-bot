import { HttpError } from '../interfaces/IHttpClient';
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly isOperational: boolean;
    constructor(message: string, statusCode?: number, isOperational?: boolean);
}
export declare class ValidationError extends AppError {
    constructor(message: string);
}
export declare class AuthenticationError extends AppError {
    constructor(message?: string);
}
export declare class AuthorizationError extends AppError {
    constructor(message?: string);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
export declare class RateLimitError extends AppError {
    constructor(message?: string);
}
export declare class ErrorHandler {
    private static instance;
    private errorCallbacks;
    private constructor();
    static getInstance(): ErrorHandler;
    onStatusCode(statusCode: number, callback: (error: AppError) => Promise<void>): void;
    handleHttpError(error: HttpError): Promise<never>;
    handleError(error: Error): AppError;
    private logError;
}
export declare const errorHandler: ErrorHandler;
//# sourceMappingURL=ErrorHandler.d.ts.map