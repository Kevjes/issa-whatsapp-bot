"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.container = exports.TOKENS = exports.Container = void 0;
class Container {
    constructor() {
        this.services = new Map();
    }
    static getInstance() {
        if (!Container.instance) {
            Container.instance = new Container();
        }
        return Container.instance;
    }
    register(token, factory, options = {}) {
        this.services.set(token, {
            factory,
            singleton: options.singleton ?? true,
        });
    }
    registerInstance(token, instance) {
        this.services.set(token, {
            factory: () => instance,
            singleton: true,
            instance,
        });
    }
    async resolve(token) {
        const serviceDefinition = this.services.get(token);
        if (!serviceDefinition) {
            throw new Error(`Service not found: ${String(token)}`);
        }
        if (serviceDefinition.singleton && serviceDefinition.instance) {
            return serviceDefinition.instance;
        }
        const instance = await serviceDefinition.factory();
        if (serviceDefinition.singleton) {
            serviceDefinition.instance = instance;
        }
        return instance;
    }
    resolveSync(token) {
        const serviceDefinition = this.services.get(token);
        if (!serviceDefinition) {
            throw new Error(`Service not found: ${String(token)}`);
        }
        if (serviceDefinition.singleton && serviceDefinition.instance) {
            return serviceDefinition.instance;
        }
        const instance = serviceDefinition.factory();
        if (serviceDefinition.singleton) {
            serviceDefinition.instance = instance;
        }
        return instance;
    }
    has(token) {
        return this.services.has(token);
    }
    remove(token) {
        return this.services.delete(token);
    }
    clear() {
        this.services.clear();
    }
    resetInstances() {
        for (const serviceDefinition of this.services.values()) {
            delete serviceDefinition.instance;
        }
    }
}
exports.Container = Container;
exports.TOKENS = {
    HTTP_CLIENT: Symbol('HttpClient'),
    WHATSAPP_HTTP_CLIENT: Symbol('WhatsAppHttpClient'),
    AI_HTTP_CLIENT: Symbol('AIHttpClient'),
    WHATSAPP_SERVICE: Symbol('WhatsAppService'),
    DATABASE_SERVICE: Symbol('DatabaseService'),
    AI_SERVICE: Symbol('AIService'),
    KNOWLEDGE_SERVICE: Symbol('KnowledgeService'),
    CONVERSATION_SERVICE: Symbol('ConversationService'),
    CONVERSATION_CONTROLLER: Symbol('ConversationController'),
    INITIALIZATION_SERVICE: Symbol('InitializationService'),
};
exports.container = Container.getInstance();
//# sourceMappingURL=Container.js.map