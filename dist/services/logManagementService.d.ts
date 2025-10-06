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
declare class LogManagementService {
    private logsDirectory;
    constructor();
    getLogFiles(): Promise<LogFileInfo[]>;
    getLogStats(): Promise<LogStats>;
    searchLogs(options?: LogSearchOptions): Promise<any[]>;
    cleanupOldLogs(daysToKeep?: number): Promise<{
        deletedFiles: string[];
        totalSizeFreed: number;
    }>;
    exportLogs(options: LogSearchOptions & {
        outputPath: string;
    }): Promise<string>;
    getRecentLogs(minutes?: number, level?: string): Promise<any[]>;
    private countLinesInFile;
    checkLogIntegrity(): Promise<{
        valid: number;
        invalid: number;
        details: any[];
    }>;
}
export declare const logManagementService: LogManagementService;
export default LogManagementService;
//# sourceMappingURL=logManagementService.d.ts.map