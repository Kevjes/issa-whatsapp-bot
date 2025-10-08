export declare class ServiceConfig {
    private static initialized;
    static initialize(): Promise<void>;
    private static setupErrorHandling;
    private static registerHttpClients;
    private static registerServices;
    static getService<T>(token: string | symbol): Promise<T>;
    static reset(): void;
}
//# sourceMappingURL=ServiceConfig.d.ts.map