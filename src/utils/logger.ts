import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { LogEntry } from '../types';
import { LOG_CONFIG } from '../config';

class Logger {
  private winstonLogger!: winston.Logger;
  private logLevel: string;

  constructor() {
    this.logLevel = LOG_CONFIG.level;
    this.initializeWinston();
  }

  private initializeWinston(): void {
    // Créer le répertoire logs s'il n'existe pas
    const logsDir = path.dirname(LOG_CONFIG.filePath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Configuration du format personnalisé
    const customFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, metadata, stack }) => {
        const logEntry: LogEntry = {
          timestamp: timestamp as string,
          level: level as any,
          message: message as string,
          metadata: metadata || undefined
        };
        
        if (stack) {
          logEntry.metadata = { ...logEntry.metadata, stack };
        }
        
        return JSON.stringify(logEntry);
      })
    );

    // Configuration de la rotation quotidienne des fichiers
    const dailyRotateFileTransport = new DailyRotateFile({
      filename: path.join(logsDir, 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d', // Garder 14 jours de logs
      format: customFormat
    });

    // Configuration des transports d'erreur séparés
    const errorRotateFileTransport = new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d', // Garder 30 jours de logs d'erreur
      level: 'error',
      format: customFormat
    });

    // Configuration du transport console pour le développement
    const consoleTransport = new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({
          format: 'HH:mm:ss'
        }),
        winston.format.printf(({ timestamp, level, message, metadata }) => {
          let logMessage = `[${timestamp}] ${level}: ${message}`;
          if (metadata && Object.keys(metadata).length > 0) {
            logMessage += ` ${JSON.stringify(metadata)}`;
          }
          return logMessage;
        })
      )
    });

    // Créer le logger Winston
    this.winstonLogger = winston.createLogger({
      level: this.logLevel,
      format: customFormat,
      transports: [
        dailyRotateFileTransport,
        errorRotateFileTransport,
        ...(process.env.NODE_ENV !== 'production' ? [consoleTransport] : [])
      ],
      // Gestion des exceptions non capturées
      exceptionHandlers: [
        new DailyRotateFile({
          filename: path.join(logsDir, 'exceptions-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d'
        })
      ],
      // Gestion des rejets de promesses non capturés
      rejectionHandlers: [
        new DailyRotateFile({
          filename: path.join(logsDir, 'rejections-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d'
        })
      ]
    });

    // Événements de rotation des fichiers
    dailyRotateFileTransport.on('rotate', (oldFilename, newFilename) => {
      this.info('Log file rotated', { oldFilename, newFilename });
    });

    errorRotateFileTransport.on('rotate', (oldFilename, newFilename) => {
      this.info('Error log file rotated', { oldFilename, newFilename });
    });
  }

  info(message: string, metadata?: any): void {
    this.winstonLogger.info(message, { metadata });
  }

  warn(message: string, metadata?: any): void {
    this.winstonLogger.warn(message, { metadata });
  }

  error(message: string, metadata?: any): void {
    this.winstonLogger.error(message, { metadata });
  }

  debug(message: string, metadata?: any): void {
    this.winstonLogger.debug(message, { metadata });
  }

  // Méthodes utilitaires pour des cas spécifiques
  logWhatsAppMessage(direction: 'incoming' | 'outgoing', phoneNumber: string, message: any): void {
    this.info(`WhatsApp message ${direction}`, {
      phoneNumber,
      message,
      type: 'whatsapp_message'
    });
  }

  logBankingOperation(operation: string, accountNumber: string, amount?: number, metadata?: any): void {
    this.info(`Banking operation: ${operation}`, {
      accountNumber,
      amount,
      type: 'banking_operation',
      ...metadata
    });
  }

  logAuthAttempt(phoneNumber: string, success: boolean, method: string): void {
    this.info(`Authentication attempt`, {
      phoneNumber,
      success,
      method,
      type: 'auth_attempt'
    });
  }

  logSessionActivity(sessionId: string, activity: string, metadata?: any): void {
    this.info(`Session activity: ${activity}`, {
      sessionId,
      type: 'session_activity',
      ...metadata
    });
  }

  // Méthode pour obtenir des statistiques de logs
  async getLogStats(): Promise<any> {
    try {
      const logsDir = path.dirname(LOG_CONFIG.filePath);
      const files = fs.readdirSync(logsDir);
      
      const stats = {
        totalFiles: files.length,
        logFiles: files.filter(f => f.includes('app-')).length,
        errorFiles: files.filter(f => f.includes('error-')).length,
        exceptionFiles: files.filter(f => f.includes('exceptions-')).length,
        rejectionFiles: files.filter(f => f.includes('rejections-')).length,
        totalSize: 0
      };

      for (const file of files) {
        const filePath = path.join(logsDir, file);
        const fileStat = fs.statSync(filePath);
        stats.totalSize += fileStat.size;
      }

      return stats;
    } catch (error) {
      this.error('Failed to get log stats', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }
}

export const logger = new Logger();