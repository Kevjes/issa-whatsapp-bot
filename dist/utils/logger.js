"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("../config");
class Logger {
    constructor() {
        this.logLevel = config_1.LOG_CONFIG.level;
        this.initializeWinston();
    }
    initializeWinston() {
        const logsDir = path_1.default.dirname(config_1.LOG_CONFIG.filePath);
        if (!fs_1.default.existsSync(logsDir)) {
            fs_1.default.mkdirSync(logsDir, { recursive: true });
        }
        const customFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.printf(({ timestamp, level, message, metadata, stack }) => {
            const logEntry = {
                timestamp: timestamp,
                level: level,
                message: message,
                metadata: metadata || undefined
            };
            if (stack) {
                logEntry.metadata = { ...logEntry.metadata, stack };
            }
            return JSON.stringify(logEntry);
        }));
        const dailyRotateFileTransport = new winston_daily_rotate_file_1.default({
            filename: path_1.default.join(logsDir, 'app-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            format: customFormat
        });
        const errorRotateFileTransport = new winston_daily_rotate_file_1.default({
            filename: path_1.default.join(logsDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '30d',
            level: 'error',
            format: customFormat
        });
        const consoleTransport = new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({
                format: 'HH:mm:ss'
            }), winston_1.default.format.printf(({ timestamp, level, message, metadata }) => {
                let logMessage = `[${timestamp}] ${level}: ${message}`;
                if (metadata && Object.keys(metadata).length > 0) {
                    logMessage += ` ${JSON.stringify(metadata)}`;
                }
                return logMessage;
            }))
        });
        this.winstonLogger = winston_1.default.createLogger({
            level: this.logLevel,
            format: customFormat,
            transports: [
                dailyRotateFileTransport,
                errorRotateFileTransport,
                ...(process.env.NODE_ENV !== 'production' ? [consoleTransport] : [])
            ],
            exceptionHandlers: [
                new winston_daily_rotate_file_1.default({
                    filename: path_1.default.join(logsDir, 'exceptions-%DATE%.log'),
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: true,
                    maxSize: '20m',
                    maxFiles: '30d'
                })
            ],
            rejectionHandlers: [
                new winston_daily_rotate_file_1.default({
                    filename: path_1.default.join(logsDir, 'rejections-%DATE%.log'),
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: true,
                    maxSize: '20m',
                    maxFiles: '30d'
                })
            ]
        });
        dailyRotateFileTransport.on('rotate', (oldFilename, newFilename) => {
            this.info('Log file rotated', { oldFilename, newFilename });
        });
        errorRotateFileTransport.on('rotate', (oldFilename, newFilename) => {
            this.info('Error log file rotated', { oldFilename, newFilename });
        });
    }
    info(message, metadata) {
        this.winstonLogger.info(message, { metadata });
    }
    warn(message, metadata) {
        this.winstonLogger.warn(message, { metadata });
    }
    error(message, metadata) {
        this.winstonLogger.error(message, { metadata });
    }
    debug(message, metadata) {
        this.winstonLogger.debug(message, { metadata });
    }
    logWhatsAppMessage(direction, phoneNumber, message) {
        this.info(`WhatsApp message ${direction}`, {
            phoneNumber,
            message,
            type: 'whatsapp_message'
        });
    }
    logBankingOperation(operation, accountNumber, amount, metadata) {
        this.info(`Banking operation: ${operation}`, {
            accountNumber,
            amount,
            type: 'banking_operation',
            ...metadata
        });
    }
    logAuthAttempt(phoneNumber, success, method) {
        this.info(`Authentication attempt`, {
            phoneNumber,
            success,
            method,
            type: 'auth_attempt'
        });
    }
    logSessionActivity(sessionId, activity, metadata) {
        this.info(`Session activity: ${activity}`, {
            sessionId,
            type: 'session_activity',
            ...metadata
        });
    }
    async getLogStats() {
        try {
            const logsDir = path_1.default.dirname(config_1.LOG_CONFIG.filePath);
            const files = fs_1.default.readdirSync(logsDir);
            const stats = {
                totalFiles: files.length,
                logFiles: files.filter(f => f.includes('app-')).length,
                errorFiles: files.filter(f => f.includes('error-')).length,
                exceptionFiles: files.filter(f => f.includes('exceptions-')).length,
                rejectionFiles: files.filter(f => f.includes('rejections-')).length,
                totalSize: 0
            };
            for (const file of files) {
                const filePath = path_1.default.join(logsDir, file);
                const fileStat = fs_1.default.statSync(filePath);
                stats.totalSize += fileStat.size;
            }
            return stats;
        }
        catch (error) {
            this.error('Failed to get log stats', { error: error instanceof Error ? error.message : String(error) });
            return null;
        }
    }
}
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map