/**
 * Container d'injection de dépendances simple
 */
export type ServiceFactory<T> = () => T;
export type AsyncServiceFactory<T> = () => Promise<T>;

export interface ServiceDefinition<T> {
  factory: ServiceFactory<T> | AsyncServiceFactory<T>;
  singleton?: boolean;
  instance?: T;
}

export class Container {
  private static instance: Container;
  private services: Map<string | symbol, ServiceDefinition<any>> = new Map();

  private constructor() {}

  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  /**
   * Enregistrer un service
   */
  public register<T>(
    token: string | symbol,
    factory: ServiceFactory<T> | AsyncServiceFactory<T>,
    options: { singleton?: boolean } = {}
  ): void {
    this.services.set(token, {
      factory,
      singleton: options.singleton ?? true, // Par défaut singleton
    });
  }

  /**
   * Enregistrer une instance directement
   */
  public registerInstance<T>(token: string | symbol, instance: T): void {
    this.services.set(token, {
      factory: () => instance,
      singleton: true,
      instance,
    });
  }

  /**
   * Résoudre un service
   */
  public async resolve<T>(token: string | symbol): Promise<T> {
    const serviceDefinition = this.services.get(token);
    
    if (!serviceDefinition) {
      throw new Error(`Service not found: ${String(token)}`);
    }

    // Si c'est un singleton et qu'on a déjà une instance
    if (serviceDefinition.singleton && serviceDefinition.instance) {
      return serviceDefinition.instance;
    }

    // Créer une nouvelle instance
    const instance = await serviceDefinition.factory();

    // Stocker l'instance si c'est un singleton
    if (serviceDefinition.singleton) {
      serviceDefinition.instance = instance;
    }

    return instance;
  }

  /**
   * Résoudre un service de manière synchrone (pour les factories synchrones)
   */
  public resolveSync<T>(token: string | symbol): T {
    const serviceDefinition = this.services.get(token);
    
    if (!serviceDefinition) {
      throw new Error(`Service not found: ${String(token)}`);
    }

    // Si c'est un singleton et qu'on a déjà une instance
    if (serviceDefinition.singleton && serviceDefinition.instance) {
      return serviceDefinition.instance;
    }

    // Créer une nouvelle instance (factory doit être synchrone)
    const instance = (serviceDefinition.factory as ServiceFactory<T>)();

    // Stocker l'instance si c'est un singleton
    if (serviceDefinition.singleton) {
      serviceDefinition.instance = instance;
    }

    return instance;
  }

  /**
   * Vérifier si un service est enregistré
   */
  public has(token: string | symbol): boolean {
    return this.services.has(token);
  }

  /**
   * Supprimer un service
   */
  public remove(token: string | symbol): boolean {
    return this.services.delete(token);
  }

  /**
   * Nettoyer toutes les instances (utile pour les tests)
   */
  public clear(): void {
    this.services.clear();
  }

  /**
   * Réinitialiser les instances singleton (garde les définitions)
   */
  public resetInstances(): void {
    for (const serviceDefinition of this.services.values()) {
      delete serviceDefinition.instance;
    }
  }
}

// Tokens pour les services
export const TOKENS = {
  HTTP_CLIENT: Symbol('HttpClient'),
  WHATSAPP_HTTP_CLIENT: Symbol('WhatsAppHttpClient'),
  BANKING_HTTP_CLIENT: Symbol('BankingHttpClient'),
  WHATSAPP_SERVICE: Symbol('WhatsAppService'),
  BANKING_SERVICE: Symbol('BankingService'),
  BANKING_AUTH_SERVICE: Symbol('BankingAuthService'),
  PIN_SESSION_SERVICE: Symbol('PinSessionService'),
  TRANSFER_SESSION_SERVICE: Symbol('TransferSessionService'),
  DATABASE_SERVICE: Symbol('DatabaseService'),
  MENU_SERVICE: Symbol('MenuService'),
  MENU_CONTROLLER: Symbol('MenuController'),
  MESSAGE_CONTROLLER: Symbol('MessageController'),
  DEEPSEEK_SERVICE: Symbol('DeepSeekService'),
} as const;

// Instance singleton
export const container = Container.getInstance();