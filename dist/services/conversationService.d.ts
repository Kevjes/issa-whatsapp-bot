import { ConversationContext } from '../types';
import { DatabaseService } from './databaseService';
import { AIService } from './aiService';
import { KnowledgeService } from './knowledgeService';
export declare class ConversationService {
    private databaseService;
    private aiService;
    private knowledgeService;
    constructor(databaseService: DatabaseService, aiService: AIService, knowledgeService: KnowledgeService);
    processMessage(phoneNumber: string, messageId: string, userMessage: string): Promise<{
        response: string;
        shouldContinue: boolean;
    }>;
    private handleGreeting;
    private handleNameCollection;
    private handleActiveConversation;
    private extractNameFromMessage;
    private isInvalidName;
    private isGreetingMessage;
    private generateFallbackResponse;
    getConversationContext(phoneNumber: string): Promise<ConversationContext | null>;
    private cleanMarkdownForWhatsApp;
    private simulateTypingWhileProcessing;
    private simulateRealisticTypingDelay;
    private schedulePendingMessageResponse;
    private scheduleFollowUpMessage;
    private sendBotMessage;
    resetConversation(phoneNumber: string): Promise<void>;
}
//# sourceMappingURL=conversationService.d.ts.map