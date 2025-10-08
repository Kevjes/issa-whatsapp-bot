"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const logger_1 = require("../utils/logger");
class DashboardService {
    constructor(databaseService, logManagementService, pinSessionService, transferSessionService) {
        this.databaseService = databaseService;
        this.logManagementService = logManagementService;
        this.pinSessionService = pinSessionService;
        this.transferSessionService = transferSessionService;
        this.alerts = new Map();
    }
    async getDashboardStats() {
        try {
            const [sessionStats, logStats, transferStats] = await Promise.all([
                this.getSessionAnalytics(),
                this.getLogAnalytics(),
                this.getTransferAnalytics()
            ]);
            return {
                totalSessions: sessionStats.totalSessions,
                activeSessions: sessionStats.activeSessions,
                totalMessages: logStats.totalLogs,
                totalErrors: logStats.errorCount,
                totalTransfers: transferStats.totalTransfers,
                successfulTransfers: transferStats.successfulTransfers,
                failedTransfers: transferStats.failedTransfers,
                systemUptime: process.uptime()
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting dashboard stats', { error });
            throw error;
        }
    }
    async getLogAnalytics(filter) {
        try {
            const logs = await this.logManagementService.getLogFiles();
            const recentLogs = await this.getRecentLogs(100);
            const errorCount = recentLogs.filter(log => log.level === 'error').length;
            const warningCount = recentLogs.filter(log => log.level === 'warn').length;
            const infoCount = recentLogs.filter(log => log.level === 'info').length;
            const debugCount = recentLogs.filter(log => log.level === 'debug').length;
            const recentErrors = recentLogs
                .filter(log => log.level === 'error')
                .slice(0, 10);
            const errorTrends = await this.calculateErrorTrends(7);
            return {
                totalLogs: recentLogs.length,
                errorCount,
                warningCount,
                infoCount,
                debugCount,
                recentErrors,
                errorTrends
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting log analytics', { error });
            throw error;
        }
    }
    async getSessionAnalytics(filter) {
        try {
            const totalSessions = 150;
            const activeSessions = 12;
            const expiredSessions = 138;
            const averageSessionDuration = 15.5;
            const sessionsByHour = [];
            const now = new Date();
            for (let i = 23; i >= 0; i--) {
                const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
                sessionsByHour.push({
                    hour: hour.getHours(),
                    count: Math.floor(Math.random() * 20) + 1,
                    date: hour.toISOString().split('T')[0]
                });
            }
            return {
                totalSessions,
                activeSessions,
                expiredSessions,
                averageSessionDuration,
                sessionsByHour
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting session analytics', { error });
            throw error;
        }
    }
    async getSystemHealth() {
        try {
            const memoryUsage = process.memoryUsage();
            const totalMemory = memoryUsage.heapTotal + memoryUsage.external;
            const usedMemory = memoryUsage.heapUsed;
            const services = [
                {
                    name: 'WhatsApp API',
                    status: 'healthy',
                    lastCheck: new Date().toISOString(),
                    responseTime: 150
                },
                {
                    name: 'Banking API',
                    status: 'healthy',
                    lastCheck: new Date().toISOString(),
                    responseTime: 300
                },
                {
                    name: 'Database',
                    status: 'healthy',
                    lastCheck: new Date().toISOString(),
                    responseTime: 50
                }
            ];
            const memoryPercentage = (usedMemory / totalMemory) * 100;
            let status = 'healthy';
            if (memoryPercentage > 90) {
                status = 'critical';
            }
            else if (memoryPercentage > 75) {
                status = 'warning';
            }
            return {
                status,
                uptime: process.uptime(),
                memoryUsage: {
                    used: usedMemory,
                    total: totalMemory,
                    percentage: memoryPercentage
                },
                cpuUsage: 0,
                diskUsage: {
                    used: 0,
                    total: 0,
                    percentage: 0
                },
                services
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting system health', { error });
            throw error;
        }
    }
    async getTransferAnalytics(filter) {
        try {
            const totalTransfers = 85;
            const successfulTransfers = 78;
            const failedTransfers = 7;
            const totalAmount = 125000;
            const averageAmount = totalAmount / totalTransfers;
            const transfersByDay = [];
            const now = new Date();
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                const count = Math.floor(Math.random() * 15) + 5;
                const amount = count * (Math.floor(Math.random() * 2000) + 500);
                transfersByDay.push({
                    date: date.toISOString().split('T')[0],
                    count,
                    amount,
                    successRate: 85 + Math.random() * 10
                });
            }
            const topCurrencies = [
                { currency: 'SSP', count: 65, totalAmount: 95000, percentage: 76.5 },
                { currency: 'USD', count: 20, totalAmount: 30000, percentage: 23.5 }
            ];
            return {
                totalTransfers,
                successfulTransfers,
                failedTransfers,
                totalAmount,
                averageAmount,
                transfersByDay,
                topCurrencies
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting transfer analytics', { error });
            throw error;
        }
    }
    async getUserActivities(params) {
        try {
            const mockUsers = [
                {
                    phoneNumber: '+249123456789',
                    lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                    totalSessions: 15,
                    totalTransfers: 8,
                    totalAmount: 12500,
                    status: 'active'
                },
                {
                    phoneNumber: '+249987654321',
                    lastActivity: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                    totalSessions: 8,
                    totalTransfers: 3,
                    totalAmount: 5000,
                    status: 'inactive'
                }
            ];
            const total = mockUsers.length;
            const totalPages = Math.ceil(total / params.limit);
            const startIndex = (params.page - 1) * params.limit;
            const endIndex = startIndex + params.limit;
            const data = mockUsers.slice(startIndex, endIndex);
            return {
                data,
                pagination: {
                    page: params.page,
                    limit: params.limit,
                    total,
                    totalPages,
                    hasNext: params.page < totalPages,
                    hasPrev: params.page > 1
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting user activities', { error });
            throw error;
        }
    }
    async getDatabaseStats() {
        try {
            const tableStats = [
                { tableName: 'pin_sessions', recordCount: 150, sizeBytes: 25600 },
                { tableName: 'tokens', recordCount: 45, sizeBytes: 8192 },
                { tableName: 'logs', recordCount: 1250, sizeBytes: 204800 }
            ];
            const totalRecords = tableStats.reduce((sum, table) => sum + table.recordCount, 0);
            const databaseSize = tableStats.reduce((sum, table) => sum + table.sizeBytes, 0);
            return {
                totalRecords,
                tableStats,
                databaseSize,
                lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting database stats', { error });
            throw error;
        }
    }
    async getDashboardAlerts(params) {
        try {
            const alertsArray = Array.from(this.alerts.values());
            const total = alertsArray.length;
            const totalPages = Math.ceil(total / params.limit);
            const startIndex = (params.page - 1) * params.limit;
            const endIndex = startIndex + params.limit;
            const data = alertsArray.slice(startIndex, endIndex);
            return {
                data,
                pagination: {
                    page: params.page,
                    limit: params.limit,
                    total,
                    totalPages,
                    hasNext: params.page < totalPages,
                    hasPrev: params.page > 1
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting dashboard alerts', { error });
            throw error;
        }
    }
    async getLogs(params, filter) {
        try {
            const logs = await this.getRecentLogs(1000);
            let filteredLogs = logs;
            if (filter) {
                if (filter.level && filter.level.length > 0) {
                    filteredLogs = filteredLogs.filter(log => filter.level.includes(log.level));
                }
                if (filter.dateRange) {
                    const start = new Date(filter.dateRange.start);
                    const end = new Date(filter.dateRange.end);
                    filteredLogs = filteredLogs.filter(log => {
                        const logDate = new Date(log.timestamp);
                        return logDate >= start && logDate <= end;
                    });
                }
                if (filter.search) {
                    const searchTerm = filter.search.toLowerCase();
                    filteredLogs = filteredLogs.filter(log => log.message.toLowerCase().includes(searchTerm));
                }
            }
            const total = filteredLogs.length;
            const totalPages = Math.ceil(total / params.limit);
            const startIndex = (params.page - 1) * params.limit;
            const endIndex = startIndex + params.limit;
            const data = filteredLogs.slice(startIndex, endIndex);
            return {
                data,
                pagination: {
                    page: params.page,
                    limit: params.limit,
                    total,
                    totalPages,
                    hasNext: params.page < totalPages,
                    hasPrev: params.page > 1
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting logs', { error });
            throw error;
        }
    }
    async markAlertAsRead(alertId) {
        try {
            const alert = this.alerts.get(alertId);
            if (alert) {
                alert.isRead = true;
                this.alerts.set(alertId, alert);
                return true;
            }
            return false;
        }
        catch (error) {
            logger_1.logger.error('Error marking alert as read', { error, alertId });
            return false;
        }
    }
    async cleanupOldLogs(daysToKeep) {
        try {
            const result = await this.logManagementService.cleanupOldLogs(daysToKeep);
            return {
                deletedCount: result.deletedFiles.length,
                sizeFreed: result.totalSizeFreed
            };
        }
        catch (error) {
            logger_1.logger.error('Error cleaning up old logs', { error });
            throw error;
        }
    }
    async cleanupExpiredSessions() {
        try {
            await this.pinSessionService.cleanupExpiredSessions();
            return { deletedCount: 0 };
        }
        catch (error) {
            logger_1.logger.error('Error cleaning up expired sessions', { error });
            throw error;
        }
    }
    async exportData(type, filter) {
        try {
            let data = [];
            switch (type) {
                case 'logs':
                    const logsResult = await this.getLogs({ page: 1, limit: 10000 }, filter);
                    data = logsResult.data;
                    break;
                case 'sessions':
                    data = [];
                    break;
                case 'transfers':
                    data = [];
                    break;
            }
            const csvContent = this.convertToCSV(data);
            return Buffer.from(csvContent, 'utf-8');
        }
        catch (error) {
            logger_1.logger.error('Error exporting data', { error, type });
            throw error;
        }
    }
    async getRealTimeMetrics() {
        try {
            const memoryUsage = process.memoryUsage();
            const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
            return {
                activeUsers: 12,
                activeSessions: 8,
                systemLoad: 0.65,
                memoryUsage: memoryPercentage
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting real-time metrics', { error });
            throw error;
        }
    }
    async createAlert(alert) {
        try {
            const newAlert = {
                ...alert,
                id: `alert_${Date.now()}`,
                timestamp: new Date().toISOString()
            };
            this.alerts.set(newAlert.id, newAlert);
            return newAlert;
        }
        catch (error) {
            logger_1.logger.error('Error creating alert', { error });
            throw error;
        }
    }
    async deleteAlert(alertId) {
        try {
            return this.alerts.delete(alertId);
        }
        catch (error) {
            logger_1.logger.error('Error deleting alert', { error, alertId });
            return false;
        }
    }
    async getErrorTrends(days) {
        try {
            return await this.calculateErrorTrends(days);
        }
        catch (error) {
            logger_1.logger.error('Error getting error trends', { error });
            throw error;
        }
    }
    async getPerformanceMetrics() {
        try {
            return {
                averageResponseTime: 250,
                requestsPerMinute: 15,
                errorRate: 2.5,
                uptime: process.uptime()
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting performance metrics', { error });
            throw error;
        }
    }
    async getRecentLogs(limit) {
        try {
            const mockLogs = [
                {
                    id: '1',
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'User authenticated successfully',
                    metadata: { phoneNumber: '+249123456789' }
                },
                {
                    id: '2',
                    timestamp: new Date(Date.now() - 60000).toISOString(),
                    level: 'error',
                    message: 'Failed to connect to banking API',
                    metadata: { error: 'Connection timeout' }
                }
            ];
            return mockLogs.slice(0, limit);
        }
        catch (error) {
            logger_1.logger.error('Error getting recent logs', { error });
            return [];
        }
    }
    async calculateErrorTrends(days) {
        try {
            const trends = [];
            const now = new Date();
            for (let i = days - 1; i >= 0; i--) {
                const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                trends.push({
                    date: date.toISOString().split('T')[0],
                    count: Math.floor(Math.random() * 10),
                    level: 'error'
                });
            }
            return trends;
        }
        catch (error) {
            logger_1.logger.error('Error calculating error trends', { error });
            return [];
        }
    }
    convertToCSV(data) {
        if (data.length === 0)
            return '';
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
            });
            csvRows.push(values.join(','));
        }
        return csvRows.join('\n');
    }
}
exports.DashboardService = DashboardService;
//# sourceMappingURL=dashboardService.js.map