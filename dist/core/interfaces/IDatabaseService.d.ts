import { WorkflowContext } from '../../types/workflow';
import { KnowledgeEntry } from '../../types/knowledge';
export interface IDatabaseService {
    initialize(): Promise<void>;
    createTables(): Promise<void>;
    close(): Promise<void>;
    saveWorkflowContext(userId: number, context: WorkflowContext): Promise<void>;
    loadWorkflowContext(userId: number): Promise<WorkflowContext | null>;
    getAllKnowledgeEntries(): Promise<KnowledgeEntry[]>;
    getKnowledgeByCategory(category: string): Promise<KnowledgeEntry[]>;
    searchKnowledgeBase(query: string): Promise<KnowledgeEntry[]>;
    addKnowledgeEntry(entry: Omit<KnowledgeEntry, 'id'>): Promise<number>;
}
//# sourceMappingURL=IDatabaseService.d.ts.map