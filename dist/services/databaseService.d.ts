import { User, ConversationMessage, KnowledgeBase } from '../types';
import { IDatabaseService } from '../core/interfaces/IDatabaseService';
import { WorkflowContext } from '../types/workflow';
import { KnowledgeEntry } from '../types/knowledge';
export declare class DatabaseService implements IDatabaseService {
    private db;
    private initialized;
    initialize(): Promise<void>;
    private runQuery;
    private getQuery;
    private allQuery;
    private ensureInitialized;
    createTables(): Promise<void>;
    getOrCreateUser(phoneNumber: string, name?: string): Promise<User>;
    updateUserState(userId: number, state: User['conversationState'], name?: string, pendingMessage?: string | null): Promise<void>;
    saveConversationMessage(message: Omit<ConversationMessage, 'id'>): Promise<number>;
    getConversationHistory(userId: number, limit?: number): Promise<ConversationMessage[]>;
    searchKnowledgeBase(query: string): Promise<KnowledgeEntry[]>;
    private searchKnowledgeBaseFallback;
    addKnowledgeEntry(entry: Omit<KnowledgeBase, 'id' | 'createdAt' | 'updatedAt'>): Promise<number>;
    getActiveUsers(): Promise<User[]>;
    close(): Promise<void>;
    saveWorkflowContext(userId: number, context: WorkflowContext): Promise<void>;
    loadWorkflowContext(userId: number): Promise<WorkflowContext | null>;
    getWorkflowContextById(userId: number, workflowId: string): Promise<WorkflowContext | null>;
    getAllKnowledgeEntries(): Promise<KnowledgeEntry[]>;
    getKnowledgeByCategory(category: string): Promise<KnowledgeEntry[]>;
}
//# sourceMappingURL=databaseService.d.ts.map