"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.ErrorHandler = exports.RateLimitError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
const logger_1 = require("../../utils/logger");
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401);
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403);
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}
exports.NotFoundError = NotFoundError;
class RateLimitError extends AppError {
    constructor(message = 'Rate limit exceeded') {
        super(message, 429);
    }
}
exports.RateLimitError = RateLimitError;
class ErrorHandler {
    constructor() {
        this.errorCallbacks = new Map();
    }
    static getInstance() {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }
    onStatusCode(statusCode, callback) {
        this.errorCallbacks.set(statusCode, callback);
    }
    async handleHttpError(error) {
        const statusCode = error.status || error.response?.status || 500;
        const message = error.message || 'Unknown error occurred';
        let appError;
        switch (statusCode) {
            case 400:
                appError = new ValidationError(message);
                break;
            case 401:
                appError = new AuthenticationError(message);
                break;
            case 403:
                appError = new AuthorizationError(message);
                break;
            case 404:
                appError = new NotFoundError(message);
                break;
            case 429:
                appError = new RateLimitError(message);
                break;
            default:
                appError = new AppError(message, statusCode);
        }
        const callback = this.errorCallbacks.get(statusCode);
        if (callback) {
            try {
                await callback(appError);
            }
            catch (callbackError) {
                logger_1.logger.error('Error in error callback', { callbackError });
            }
        }
        this.logError(appError, error);
        throw appError;
    }
    handleError(error) {
        if (error instanceof AppError) {
            this.logError(error);
            return error;
        }
        const appError = new AppError(error.message || 'Unknown error occurred');
        this.logError(appError, error);
        return appError;
    }
    logError(appError, originalError) {
        const errorInfo = {
            message: appError.message,
            statusCode: appError.statusCode,
            isOperational: appError.isOperational,
            stack: appError.stack,
            originalError: originalError ? {
                message: originalError.message,
                stack: originalError.stack
            } : undefined
        };
        if (appError.statusCode >= 500) {
            logger_1.logger.error('Server error', errorInfo);
        }
        else {
            logger_1.logger.warn('Client error', errorInfo);
        }
    }
}
exports.ErrorHandler = ErrorHandler;
exports.errorHandler = ErrorHandler.getInstance();
//# sourceMappingURL=ErrorHandler.js.map