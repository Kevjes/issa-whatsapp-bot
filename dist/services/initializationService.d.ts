import { DatabaseService } from './databaseService';
import { KnowledgeService } from './knowledgeService';
import { AIService } from './aiService';
import { ConversationService } from './conversationService';
import { ConversationController } from '../controllers/conversationController';
import { IWhatsAppService } from '../core/interfaces/IWhatsAppService';
import { IHttpClient } from '../core/interfaces/IHttpClient';
export declare class InitializationService {
    private databaseService;
    private knowledgeService;
    private aiService;
    private conversationService;
    private conversationController;
    constructor();
    initialize(httpClient: IHttpClient, whatsappService: IWhatsAppService): Promise<{
        conversationController: ConversationController;
        databaseService: DatabaseService;
        aiService: AIService;
        knowledgeService: KnowledgeService;
        conversationService: ConversationService;
    }>;
    private initializeDatabase;
    private initializeKnowledgeBase;
    healthCheck(): Promise<{
        database: boolean;
        ai: boolean;
        knowledgeBase: boolean;
        overall: boolean;
    }>;
    cleanup(): Promise<void>;
    getSystemStats(): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=initializationService.d.ts.map