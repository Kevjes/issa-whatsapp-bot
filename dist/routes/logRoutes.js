"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const logManagementService_1 = require("../services/logManagementService");
const logger_1 = require("../utils/logger");
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
router.get('/stats', async (req, res) => {
    try {
        const stats = await logManagementService_1.logManagementService.getLogStats();
        logger_1.logger.logSessionActivity('log-api', 'stats-requested', {
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get log stats via API', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve log statistics'
        });
    }
});
router.get('/files', async (req, res) => {
    try {
        const files = await logManagementService_1.logManagementService.getLogFiles();
        logger_1.logger.logSessionActivity('log-api', 'files-listed', {
            filesCount: files.length,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });
        res.json({
            success: true,
            data: files
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get log files via API', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve log files'
        });
    }
});
router.post('/search', async (req, res) => {
    try {
        const options = req.body;
        if (options.startDate) {
            options.startDate = new Date(options.startDate);
        }
        if (options.endDate) {
            options.endDate = new Date(options.endDate);
        }
        if (!options.limit || options.limit > 1000) {
            options.limit = 1000;
        }
        const results = await logManagementService_1.logManagementService.searchLogs(options);
        logger_1.logger.logSessionActivity('log-api', 'search-performed', {
            searchOptions: options,
            resultsCount: results.length,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });
        res.json({
            success: true,
            data: {
                results,
                count: results.length,
                searchOptions: options
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to search logs via API', { error: error instanceof Error ? error.message : String(error), body: req.body });
        res.status(500).json({
            success: false,
            error: 'Failed to search logs'
        });
    }
});
router.get('/recent', async (req, res) => {
    try {
        const minutes = parseInt(req.query.minutes) || 60;
        const level = req.query.level;
        const limitedMinutes = Math.min(minutes, 24 * 60);
        const logs = await logManagementService_1.logManagementService.getRecentLogs(limitedMinutes, level);
        logger_1.logger.logSessionActivity('log-api', 'recent-logs-requested', {
            minutes: limitedMinutes,
            level,
            resultsCount: logs.length,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });
        res.json({
            success: true,
            data: {
                logs,
                count: logs.length,
                timeRange: `${limitedMinutes} minutes`,
                level: level || 'all'
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get recent logs via API', { error: error instanceof Error ? error.message : String(error), query: req.query });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve recent logs'
        });
    }
});
router.post('/export', async (req, res) => {
    try {
        const options = req.body;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = options.filename || `logs-export-${timestamp}.json`;
        const outputPath = path_1.default.join(process.cwd(), 'exports', filename);
        const fs = require('fs');
        const exportsDir = path_1.default.dirname(outputPath);
        if (!fs.existsSync(exportsDir)) {
            fs.mkdirSync(exportsDir, { recursive: true });
        }
        if (options.startDate) {
            options.startDate = new Date(options.startDate);
        }
        if (options.endDate) {
            options.endDate = new Date(options.endDate);
        }
        const exportPath = await logManagementService_1.logManagementService.exportLogs({
            ...options,
            outputPath
        });
        logger_1.logger.logSessionActivity('log-api', 'logs-exported', {
            exportPath,
            searchOptions: options,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });
        res.json({
            success: true,
            data: {
                exportPath,
                filename,
                downloadUrl: `/api/logs/download/${filename}`
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to export logs via API', { error: error instanceof Error ? error.message : String(error), body: req.body });
        res.status(500).json({
            success: false,
            error: 'Failed to export logs'
        });
    }
});
router.get('/download/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path_1.default.join(process.cwd(), 'exports', filename);
        const fs = require('fs');
        if (!fs.existsSync(filePath) || !filePath.includes('exports')) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }
        logger_1.logger.logSessionActivity('log-api', 'file-downloaded', {
            filename,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });
        return res.download(filePath, filename, (err) => {
            if (err) {
                logger_1.logger.error('Failed to download export file', { error: err.message, filename });
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        error: 'Failed to download file'
                    });
                }
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to handle download request', { error: error instanceof Error ? error.message : String(error), filename: req.params.filename });
        res.status(500).json({
            success: false,
            error: 'Failed to process download request'
        });
    }
});
router.delete('/cleanup', async (req, res) => {
    try {
        const daysToKeep = parseInt(req.query.days) || 30;
        const limitedDays = Math.max(7, Math.min(daysToKeep, 365));
        const result = await logManagementService_1.logManagementService.cleanupOldLogs(limitedDays);
        logger_1.logger.logSessionActivity('log-api', 'cleanup-performed', {
            daysToKeep: limitedDays,
            deletedFiles: result.deletedFiles,
            totalSizeFreed: result.totalSizeFreed,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });
        res.json({
            success: true,
            data: {
                ...result,
                daysToKeep: limitedDays
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to cleanup logs via API', { error: error instanceof Error ? error.message : String(error), query: req.query });
        res.status(500).json({
            success: false,
            error: 'Failed to cleanup logs'
        });
    }
});
router.get('/integrity', async (req, res) => {
    try {
        const integrity = await logManagementService_1.logManagementService.checkLogIntegrity();
        logger_1.logger.logSessionActivity('log-api', 'integrity-checked', {
            valid: integrity.valid,
            invalid: integrity.invalid,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });
        res.json({
            success: true,
            data: integrity
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to check log integrity via API', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to check log integrity'
        });
    }
});
router.get('/health', async (req, res) => {
    try {
        const stats = await logManagementService_1.logManagementService.getLogStats();
        const recentErrors = await logManagementService_1.logManagementService.getRecentLogs(60, 'error');
        const health = {
            status: 'healthy',
            logsDirectory: path_1.default.dirname(require('../config').LOG_CONFIG.filePath),
            totalFiles: stats.totalFiles,
            totalSize: stats.totalSize,
            recentErrors: recentErrors.length,
            oldestLog: stats.oldestLog,
            newestLog: stats.newestLog
        };
        if (recentErrors.length > 50) {
            health.status = 'warning';
        }
        if (recentErrors.length > 100) {
            health.status = 'critical';
        }
        res.json({
            success: true,
            data: health
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to check logs health via API', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to check logs health',
            status: 'error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=logRoutes.js.map