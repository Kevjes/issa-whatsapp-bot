import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { LOG_CONFIG } from '../config';

export interface LogFileInfo {
  filename: string;
  path: string;
  size: number;
  created: Date;
  modified: Date;
  type: 'app' | 'error' | 'exception' | 'rejection';
}

export interface LogSearchOptions {
  level?: 'info' | 'warn' | 'error' | 'debug';
  startDate?: Date;
  endDate?: Date;
  phoneNumber?: string;
  type?: string;
  limit?: number;
}

export interface LogStats {
  totalFiles: number;
  totalSize: number;
  logFiles: LogFileInfo[];
  oldestLog: Date | null;
  newestLog: Date | null;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  debugCount: number;
}

class LogManagementService {
  private logsDirectory: string;

  constructor() {
    this.logsDirectory = path.dirname(LOG_CONFIG.filePath);
  }

  /**
   * Obtenir la liste de tous les fichiers de logs
   */
  async getLogFiles(): Promise<LogFileInfo[]> {
    try {
      if (!fs.existsSync(this.logsDirectory)) {
        return [];
      }

      const files = fs.readdirSync(this.logsDirectory);
      const logFiles: LogFileInfo[] = [];

      for (const filename of files) {
        const filePath = path.join(this.logsDirectory, filename);
        const stats = fs.statSync(filePath);

        let type: LogFileInfo['type'] = 'app';
        if (filename.includes('error-')) type = 'error';
        else if (filename.includes('exceptions-')) type = 'exception';
        else if (filename.includes('rejections-')) type = 'rejection';

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
    } catch (error) {
      logger.error('Failed to get log files', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Obtenir les statistiques des logs
   */
  async getLogStats(): Promise<LogStats> {
    try {
      const logFiles = await this.getLogFiles();
      const totalSize = logFiles.reduce((sum, file) => sum + file.size, 0);
      
      let oldestLog: Date | null = null;
      let newestLog: Date | null = null;
      let errorCount = 0;
      let warningCount = 0;
      let infoCount = 0;
      let debugCount = 0;

      if (logFiles.length > 0) {
        oldestLog = logFiles[logFiles.length - 1].created;
        newestLog = logFiles[0].modified;

        // Compter les entrées par niveau (approximation basée sur les fichiers)
        for (const file of logFiles) {
          if (file.type === 'error') {
            errorCount += await this.countLinesInFile(file.path);
          } else if (file.type === 'app') {
            // Pour les fichiers app, on estime la distribution
            const lines = await this.countLinesInFile(file.path);
            infoCount += Math.floor(lines * 0.6); // 60% info
            warningCount += Math.floor(lines * 0.25); // 25% warn
            debugCount += Math.floor(lines * 0.15); // 15% debug
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
    } catch (error) {
      logger.error('Failed to get log stats', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Rechercher dans les logs
   */
  async searchLogs(options: LogSearchOptions = {}): Promise<any[]> {
    try {
      const logFiles = await this.getLogFiles();
      const results: any[] = [];
      const limit = options.limit || 100;

      for (const file of logFiles) {
        if (results.length >= limit) break;

        // Filtrer par type de fichier si nécessaire
        if (options.level === 'error' && file.type !== 'error') continue;

        const content = fs.readFileSync(file.path, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (results.length >= limit) break;

          try {
            const logEntry = JSON.parse(line);
            
            // Filtrer par niveau
            if (options.level && logEntry.level !== options.level) continue;
            
            // Filtrer par date
            if (options.startDate && new Date(logEntry.timestamp) < options.startDate) continue;
            if (options.endDate && new Date(logEntry.timestamp) > options.endDate) continue;
            
            // Filtrer par numéro de téléphone
            if (options.phoneNumber && 
                (!logEntry.metadata || !JSON.stringify(logEntry.metadata).includes(options.phoneNumber))) {
              continue;
            }
            
            // Filtrer par type
            if (options.type && 
                (!logEntry.metadata || logEntry.metadata.type !== options.type)) {
              continue;
            }

            results.push({
              ...logEntry,
              file: file.filename
            });
          } catch (parseError) {
            // Ignorer les lignes qui ne sont pas du JSON valide
            continue;
          }
        }
      }

      return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      logger.error('Failed to search logs', { error: error instanceof Error ? error.message : String(error), options });
      throw error;
    }
  }

  /**
   * Nettoyer les anciens fichiers de logs
   */
  async cleanupOldLogs(daysToKeep: number = 30): Promise<{ deletedFiles: string[], totalSizeFreed: number }> {
    try {
      const logFiles = await this.getLogFiles();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const filesToDelete = logFiles.filter(file => file.created < cutoffDate);
      const deletedFiles: string[] = [];
      let totalSizeFreed = 0;

      for (const file of filesToDelete) {
        try {
          totalSizeFreed += file.size;
          fs.unlinkSync(file.path);
          deletedFiles.push(file.filename);
          logger.info('Deleted old log file', { filename: file.filename, size: file.size });
        } catch (deleteError) {
          logger.error('Failed to delete log file', { 
            filename: file.filename, 
            error: deleteError instanceof Error ? deleteError.message : String(deleteError) 
          });
        }
      }

      logger.info('Log cleanup completed', { 
        deletedCount: deletedFiles.length, 
        totalSizeFreed,
        daysToKeep 
      });

      return { deletedFiles, totalSizeFreed };
    } catch (error) {
      logger.error('Failed to cleanup logs', { error: error instanceof Error ? error.message : String(error), daysToKeep });
      throw error;
    }
  }

  /**
   * Exporter les logs vers un fichier
   */
  async exportLogs(options: LogSearchOptions & { outputPath: string }): Promise<string> {
    try {
      const logs = await this.searchLogs(options);
      const exportData = {
        exportDate: new Date().toISOString(),
        filters: options,
        totalEntries: logs.length,
        logs
      };

      const content = JSON.stringify(exportData, null, 2);
      fs.writeFileSync(options.outputPath, content, 'utf8');

      logger.info('Logs exported successfully', { 
        outputPath: options.outputPath, 
        entriesCount: logs.length 
      });

      return options.outputPath;
    } catch (error) {
      logger.error('Failed to export logs', { error: error instanceof Error ? error.message : String(error), options });
      throw error;
    }
  }

  /**
   * Obtenir les logs récents pour le monitoring
   */
  async getRecentLogs(minutes: number = 60, level?: string): Promise<any[]> {
    const startDate = new Date();
    startDate.setMinutes(startDate.getMinutes() - minutes);

    return this.searchLogs({
      startDate,
      level: level as any,
      limit: 500
    });
  }

  /**
   * Compter les lignes dans un fichier
   */
  private async countLinesInFile(filePath: string): Promise<number> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return content.split('\n').filter(line => line.trim()).length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Vérifier l'intégrité des fichiers de logs
   */
  async checkLogIntegrity(): Promise<{ valid: number, invalid: number, details: any[] }> {
    try {
      const logFiles = await this.getLogFiles();
      let valid = 0;
      let invalid = 0;
      const details: any[] = [];

      for (const file of logFiles) {
        try {
          const content = fs.readFileSync(file.path, 'utf8');
          const lines = content.split('\n').filter(line => line.trim());
          let validLines = 0;
          let invalidLines = 0;

          for (const line of lines) {
            try {
              JSON.parse(line);
              validLines++;
            } catch {
              invalidLines++;
            }
          }

          if (invalidLines === 0) {
            valid++;
          } else {
            invalid++;
          }

          details.push({
            filename: file.filename,
            totalLines: lines.length,
            validLines,
            invalidLines,
            isValid: invalidLines === 0
          });
        } catch (error) {
          invalid++;
          details.push({
            filename: file.filename,
            error: error instanceof Error ? error.message : String(error),
            isValid: false
          });
        }
      }

      return { valid, invalid, details };
    } catch (error) {
      logger.error('Failed to check log integrity', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}

export const logManagementService = new LogManagementService();
export default LogManagementService;