import { logger } from '../../utils/logger';
import { HttpError } from '../interfaces/IHttpClient';

/**
 * Types d'erreurs personnalisées
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429);
  }
}

/**
 * Gestionnaire d'erreurs centralisé
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorCallbacks: Map<number, (error: AppError) => Promise<void>> = new Map();

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Enregistrer un callback pour un code de statut spécifique
   */
  public onStatusCode(statusCode: number, callback: (error: AppError) => Promise<void>): void {
    this.errorCallbacks.set(statusCode, callback);
  }

  /**
   * Gérer une erreur HTTP
   */
  public async handleHttpError(error: HttpError): Promise<never> {
    const statusCode = error.status || error.response?.status || 500;
    const message = error.message || 'Unknown error occurred';

    let appError: AppError;

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

    // Exécuter le callback spécifique au code de statut s'il existe
    const callback = this.errorCallbacks.get(statusCode);
    if (callback) {
      try {
        await callback(appError);
      } catch (callbackError) {
        logger.error('Error in error callback', { callbackError });
      }
    }

    // Logger l'erreur
    this.logError(appError, error);

    throw appError;
  }

  /**
   * Gérer une erreur générale
   */
  public handleError(error: Error): AppError {
    if (error instanceof AppError) {
      this.logError(error);
      return error;
    }

    const appError = new AppError(error.message || 'Unknown error occurred');
    this.logError(appError, error);
    return appError;
  }

  /**
   * Logger une erreur
   */
  private logError(appError: AppError, originalError?: Error): void {
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
      logger.error('Server error', errorInfo);
    } else {
      logger.warn('Client error', errorInfo);
    }
  }
}

// Instance singleton
export const errorHandler = ErrorHandler.getInstance();