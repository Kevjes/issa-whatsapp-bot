declare class Logger {
    private winstonLogger;
    private logLevel;
    constructor();
    private initializeWinston;
    info(message: string, metadata?: any): void;
    warn(message: string, metadata?: any): void;
    error(message: string, metadata?: any): void;
    debug(message: string, metadata?: any): void;
    logWhatsAppMessage(direction: 'incoming' | 'outgoing', phoneNumber: string, message: any): void;
    logBankingOperation(operation: string, accountNumber: string, amount?: number, metadata?: any): void;
    logAuthAttempt(phoneNumber: string, success: boolean, method: string): void;
    logSessionActivity(sessionId: string, activity: string, metadata?: any): void;
    getLogStats(): Promise<any>;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map