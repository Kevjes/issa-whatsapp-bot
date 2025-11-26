export type ServiceFactory<T> = () => T;
export type AsyncServiceFactory<T> = () => Promise<T>;
export interface ServiceDefinition<T> {
    factory: ServiceFactory<T> | AsyncServiceFactory<T>;
    singleton?: boolean;
    instance?: T;
}
export declare class Container {
    private static instance;
    private services;
    private constructor();
    static getInstance(): Container;
    register<T>(token: string | symbol, factory: ServiceFactory<T> | AsyncServiceFactory<T>, options?: {
        singleton?: boolean;
    }): void;
    registerInstance<T>(token: string | symbol, instance: T): void;
    resolve<T>(token: string | symbol): Promise<T>;
    resolveSync<T>(token: string | symbol): T;
    has(token: string | symbol): boolean;
    remove(token: string | symbol): boolean;
    clear(): void;
    resetInstances(): void;
}
export declare const TOKENS: {
    readonly HTTP_CLIENT: symbol;
    readonly WHATSAPP_HTTP_CLIENT: symbol;
    readonly AI_HTTP_CLIENT: symbol;
    readonly WHATSAPP_SERVICE: symbol;
    readonly DATABASE_SERVICE: symbol;
    readonly AI_SERVICE: symbol;
    readonly KNOWLEDGE_SERVICE: symbol;
    readonly CONVERSATION_SERVICE: symbol;
    readonly CONVERSATION_CONTROLLER: symbol;
    readonly INITIALIZATION_SERVICE: symbol;
    readonly WORKFLOW_ENGINE: symbol;
    readonly INTENT_CLASSIFIER: symbol;
    readonly VALIDATION_SERVICE: symbol;
    readonly ENHANCED_KNOWLEDGE_SERVICE: symbol;
    readonly VECTOR_SEARCH_SERVICE: symbol;
};
export declare const container: Container;
//# sourceMappingURL=Container.d.ts.map