export interface IDatabaseService {
    initialize(): Promise<void>;
    createTables(): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=IDatabaseService.d.ts.map