import { Router, Request, Response } from 'express';
import { logManagementService, LogSearchOptions } from '../services/logManagementService';
import { logger } from '../utils/logger';
import path from 'path';

const router = Router();

/**
 * GET /api/logs/stats
 * Obtenir les statistiques des logs
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await logManagementService.getLogStats();
    
    logger.logSessionActivity('log-api', 'stats-requested', {
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get log stats via API', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve log statistics'
    });
  }
});

/**
 * GET /api/logs/files
 * Obtenir la liste des fichiers de logs
 */
router.get('/files', async (req: Request, res: Response) => {
  try {
    const files = await logManagementService.getLogFiles();
    
    logger.logSessionActivity('log-api', 'files-listed', {
      filesCount: files.length,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    logger.error('Failed to get log files via API', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve log files'
    });
  }
});

/**
 * POST /api/logs/search
 * Rechercher dans les logs
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const options: LogSearchOptions = req.body;
    
    // Validation des options
    if (options.startDate) {
      options.startDate = new Date(options.startDate);
    }
    if (options.endDate) {
      options.endDate = new Date(options.endDate);
    }
    
    // Limiter le nombre de résultats pour éviter la surcharge
    if (!options.limit || options.limit > 1000) {
      options.limit = 1000;
    }
    
    const results = await logManagementService.searchLogs(options);
    
    logger.logSessionActivity('log-api', 'search-performed', {
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
  } catch (error) {
    logger.error('Failed to search logs via API', { error: error instanceof Error ? error.message : String(error), body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to search logs'
    });
  }
});

/**
 * GET /api/logs/recent
 * Obtenir les logs récents
 */
router.get('/recent', async (req: Request, res: Response) => {
  try {
    const minutes = parseInt(req.query.minutes as string) || 60;
    const level = req.query.level as string;
    
    // Limiter à 24 heures maximum
    const limitedMinutes = Math.min(minutes, 24 * 60);
    
    const logs = await logManagementService.getRecentLogs(limitedMinutes, level);
    
    logger.logSessionActivity('log-api', 'recent-logs-requested', {
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
  } catch (error) {
    logger.error('Failed to get recent logs via API', { error: error instanceof Error ? error.message : String(error), query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve recent logs'
    });
  }
});

/**
 * POST /api/logs/export
 * Exporter les logs
 */
router.post('/export', async (req: Request, res: Response) => {
  try {
    const options: LogSearchOptions & { filename?: string } = req.body;
    
    // Générer un nom de fichier unique
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = options.filename || `logs-export-${timestamp}.json`;
    const outputPath = path.join(process.cwd(), 'exports', filename);
    
    // Créer le répertoire exports s'il n'existe pas
    const fs = require('fs');
    const exportsDir = path.dirname(outputPath);
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    
    // Validation des options
    if (options.startDate) {
      options.startDate = new Date(options.startDate);
    }
    if (options.endDate) {
      options.endDate = new Date(options.endDate);
    }
    
    const exportPath = await logManagementService.exportLogs({
      ...options,
      outputPath
    });
    
    logger.logSessionActivity('log-api', 'logs-exported', {
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
  } catch (error) {
    logger.error('Failed to export logs via API', { error: error instanceof Error ? error.message : String(error), body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to export logs'
    });
  }
});

/**
 * GET /api/logs/download/:filename
 * Télécharger un fichier d'export
 */
router.get('/download/:filename', (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'exports', filename);
    
    // Vérifier que le fichier existe et est dans le bon répertoire
    const fs = require('fs');
    if (!fs.existsSync(filePath) || !filePath.includes('exports')) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    logger.logSessionActivity('log-api', 'file-downloaded', {
      filename,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    return res.download(filePath, filename, (err) => {
      if (err) {
        logger.error('Failed to download export file', { error: err.message, filename });
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Failed to download file'
          });
        }
      }
    });
  } catch (error) {
    logger.error('Failed to handle download request', { error: error instanceof Error ? error.message : String(error), filename: req.params.filename });
    res.status(500).json({
      success: false,
      error: 'Failed to process download request'
    });
  }
});

/**
 * DELETE /api/logs/cleanup
 * Nettoyer les anciens logs
 */
router.delete('/cleanup', async (req: Request, res: Response) => {
  try {
    const daysToKeep = parseInt(req.query.days as string) || 30;
    
    // Limiter entre 7 et 365 jours
    const limitedDays = Math.max(7, Math.min(daysToKeep, 365));
    
    const result = await logManagementService.cleanupOldLogs(limitedDays);
    
    logger.logSessionActivity('log-api', 'cleanup-performed', {
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
  } catch (error) {
    logger.error('Failed to cleanup logs via API', { error: error instanceof Error ? error.message : String(error), query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup logs'
    });
  }
});

/**
 * GET /api/logs/integrity
 * Vérifier l'intégrité des logs
 */
router.get('/integrity', async (req: Request, res: Response) => {
  try {
    const integrity = await logManagementService.checkLogIntegrity();
    
    logger.logSessionActivity('log-api', 'integrity-checked', {
      valid: integrity.valid,
      invalid: integrity.invalid,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    res.json({
      success: true,
      data: integrity
    });
  } catch (error) {
    logger.error('Failed to check log integrity via API', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      error: 'Failed to check log integrity'
    });
  }
});

/**
 * GET /api/logs/health
 * Vérifier la santé du système de logs
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const stats = await logManagementService.getLogStats();
    const recentErrors = await logManagementService.getRecentLogs(60, 'error');
    
    const health = {
      status: 'healthy',
      logsDirectory: path.dirname(require('../config').LOG_CONFIG.filePath),
      totalFiles: stats.totalFiles,
      totalSize: stats.totalSize,
      recentErrors: recentErrors.length,
      oldestLog: stats.oldestLog,
      newestLog: stats.newestLog
    };
    
    // Déterminer le statut de santé
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
  } catch (error) {
    logger.error('Failed to check logs health via API', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      error: 'Failed to check logs health',
      status: 'error'
    });
  }
});

export default router;