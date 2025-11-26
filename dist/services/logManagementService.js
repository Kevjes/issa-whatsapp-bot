"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logManagementService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
class LogManagementService {
    constructor() {
        this.logsDirectory = path_1.default.dirname(config_1.LOG_CONFIG.filePath);
    }
    async getLogFiles() {
        try {
            if (!fs_1.default.existsSync(this.logsDirectory)) {
                return [];
            }
            const files = fs_1.default.readdirSync(this.logsDirectory);
            const logFiles = [];
            for (const filename of files) {
                const filePath = path_1.default.join(this.logsDirectory, filename);
                const stats = fs_1.default.statSync(filePath);
                let type = 'app';
                if (filename.includes('error-'))
                    type = 'error';
                else if (filename.includes('exceptions-'))
                    type = 'exception';
                else if (filename.includes('rejections-'))
                    type = 'rejection';
                logFiles.push({
                    filename,
                    path: filePath,
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime,
                    type
                });
            }
            return logFiles.sort((a, b) => b.modified.getTime() - a.modified.getTime());
        }
        catch (error) {
            logger_1.logger.error('Failed to get log files', { error: error instanceof Error ? error.message : String(error) });
            return [];
        }
    }
    async getLogStats() {
        try {
            const logFiles = await this.getLogFiles();
            const totalSize = logFiles.reduce((sum, file) => sum + file.size, 0);
            let oldestLog = null;
            let newestLog = null;
            let errorCount = 0;
            let warningCount = 0;
            let infoCount = 0;
            let debugCount = 0;
            if (logFiles.length > 0) {
                oldestLog = logFiles[logFiles.length - 1].created;
                newestLog = logFiles[0].modified;
                for (const file of logFiles) {
                    if (file.type === 'error') {
                        errorCount += await this.countLinesInFile(file.path);
                    }
                    else if (file.type === 'app') {
                        const lines = await this.countLinesInFile(file.path);
                        infoCount += Math.floor(lines * 0.6);
                        warningCount += Math.floor(lines * 0.25);
                        debugCount += Math.floor(lines * 0.15);
                    }
                }
            }
            return {
                totalFiles: logFiles.length,
                totalSize,
                logFiles,
                oldestLog,
                newestLog,
                errorCount,
                warningCount,
                infoCount,
                debugCount
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get log stats', { error: error instanceof Error ? error.message : String(error) });
            throw error;
        }
    }
    async searchLogs(options = {}) {
        try {
            const logFiles = await this.getLogFiles();
            const results = [];
            const limit = options.limit || 100;
            for (const file of logFiles) {
                if (results.length >= limit)
                    break;
                if (options.level === 'error' && file.type !== 'error')
                    continue;
                const content = fs_1.default.readFileSync(file.path, 'utf8');
                const lines = content.split('\n').filter(line => line.trim());
                for (const line of lines) {
                    if (results.length >= limit)
                        break;
                    try {
                        const logEntry = JSON.parse(line);
                        if (options.level && logEntry.level !== options.level)
                            continue;
                        if (options.startDate && new Date(logEntry.timestamp) < options.startDate)
                            continue;
                        if (options.endDate && new Date(logEntry.timestamp) > options.endDate)
                            continue;
                        if (options.phoneNumber &&
                            (!logEntry.metadata || !JSON.stringify(logEntry.metadata).includes(options.phoneNumber))) {
                            continue;
                        }
                        if (options.type &&
                            (!logEntry.metadata || logEntry.metadata.type !== options.type)) {
                            continue;
                        }
                        results.push({
                            ...logEntry,
                            file: file.filename
                        });
                    }
                    catch (parseError) {
                        continue;
                    }
                }
            }
            return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
        catch (error) {
            logger_1.logger.error('Failed to search logs', { error: error instanceof Error ? error.message : String(error), options });
            throw error;
        }
    }
    async cleanupOldLogs(daysToKeep = 30) {
        try {
            const logFiles = await this.getLogFiles();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            const filesToDelete = logFiles.filter(file => file.created < cutoffDate);
            const deletedFiles = [];
            let totalSizeFreed = 0;
            for (const file of filesToDelete) {
                try {
                    totalSizeFreed += file.size;
                    fs_1.default.unlinkSync(file.path);
                    deletedFiles.push(file.filename);
                    logger_1.logger.info('Deleted old log file', { filename: file.filename, size: file.size });
                }
                catch (deleteError) {
                    logger_1.logger.error('Failed to delete log file', {
                        filename: file.filename,
                        error: deleteError instanceof Error ? deleteError.message : String(deleteError)
                    });
                }
            }
            logger_1.logger.info('Log cleanup completed', {
                deletedCount: deletedFiles.length,
                totalSizeFreed,
                daysToKeep
            });
            return { deletedFiles, totalSizeFreed };
        }
        catch (error) {
            logger_1.logger.error('Failed to cleanup logs', { error: error instanceof Error ? error.message : String(error), daysToKeep });
            throw error;
        }
    }
    async exportLogs(options) {
        try {
            const logs = await this.searchLogs(options);
            const exportData = {
                exportDate: new Date().toISOString(),
                filters: options,
                totalEntries: logs.length,
                logs
            };
            const content = JSON.stringify(exportData, null, 2);
            fs_1.default.writeFileSync(options.outputPath, content, 'utf8');
            logger_1.logger.info('Logs exported successfully', {
                outputPath: options.outputPath,
                entriesCount: logs.length
            });
            return options.outputPath;
        }
        catch (error) {
            logger_1.logger.error('Failed to export logs', { error: error instanceof Error ? error.message : String(error), options });
            throw error;
        }
    }
    async getRecentLogs(minutes = 60, level) {
        const startDate = new Date();
        startDate.setMinutes(startDate.getMinutes() - minutes);
        return this.searchLogs({
            startDate,
            level: level,
            limit: 500
        });
    }
    async countLinesInFile(filePath) {
        try {
            const content = fs_1.default.readFileSync(filePath, 'utf8');
            return content.split('\n').filter(line => line.trim()).length;
        }
        catch (error) {
            return 0;
        }
    }
    async checkLogIntegrity() {
        try {
            const logFiles = await this.getLogFiles();
            let valid = 0;
            let invalid = 0;
            const details = [];
            for (const file of logFiles) {
                try {
                    const content = fs_1.default.readFileSync(file.path, 'utf8');
                    const lines = content.split('\n').filter(line => line.trim());
                    let validLines = 0;
                    let invalidLines = 0;
                    for (const line of lines) {
                        try {
                            JSON.parse(line);
                            validLines++;
                        }
                        catch {
                            invalidLines++;
                        }
                    }
                    if (invalidLines === 0) {
                        valid++;
                    }
                    else {
                        invalid++;
                    }
                    details.push({
                        filename: file.filename,
                        totalLines: lines.length,
                        validLines,
                        invalidLines,
                        isValid: invalidLines === 0
                    });
                }
                catch (error) {
                    invalid++;
                    details.push({
                        filename: file.filename,
                        error: error instanceof Error ? error.message : String(error),
                        isValid: false
                    });
                }
            }
            return { valid, invalid, details };
        }
        catch (error) {
            logger_1.logger.error('Failed to check log integrity', { error: error instanceof Error ? error.message : String(error) });
            throw error;
        }
    }
}
exports.logManagementService = new LogManagementService();
exports.default = LogManagementService;
//# sourceMappingURL=logManagementService.js.map