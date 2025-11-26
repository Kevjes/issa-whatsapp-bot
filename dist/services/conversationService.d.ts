import { ConversationContext } from '../types';
import { DatabaseService } from './databaseService';
import { AIService } from './aiService';
import { WorkflowEngine } from './workflowEngine';
import { IntentClassifier } from './intentClassifier';
import { EnhancedKnowledgeService } from './enhancedKnowledgeService';
export declare class ConversationService {
    private databaseService;
    private aiService;
    private workflowEngine;
    private intentClassifier;
    private knowledgeService;
    constructor(databaseService: DatabaseService, aiService: AIService, workflowEngine: WorkflowEngine, intentClassifier: IntentClassifier, knowledgeService: EnhancedKnowledgeService);
    processMessage(phoneNumber: string, messageId: string, userMessage: string): Promise<{
        response: string;
        shouldContinue: boolean;
    }>;
    private handleWorkflowStep;
    private handleNoActiveWorkflow;
    private startNameCollectionWorkflow;
    private startWorkflowFromIntent;
    private handleAIConversation;
    private generateFallbackResponse;
    getConversationContext(phoneNumber: string): Promise<ConversationContext | null>;
    private cleanMarkdownForWhatsApp;
    private simulateTypingWhileProcessing;
    private simulateRealisticTypingDelay;
    resetConversation(phoneNumber: string): Promise<void>;
}
//# sourceMappingURL=conversationService.d.ts.map