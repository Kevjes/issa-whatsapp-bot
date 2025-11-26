import { WorkflowContext } from './workflow';
export interface Intent {
    name: string;
    confidence: number;
    entities?: Entity[];
    workflowId?: string;
    category?: IntentCategory;
    metadata?: Record<string, any>;
}
export type IntentCategory = 'greeting' | 'product_inquiry' | 'product_purchase' | 'complaint' | 'support' | 'account_management' | 'payment' | 'cancellation' | 'general_question' | 'unknown';
export interface Entity {
    type: EntityType;
    value: string;
    confidence: number;
    startIndex?: number;
    endIndex?: number;
    metadata?: Record<string, any>;
}
export type EntityType = 'person_name' | 'phone_number' | 'email' | 'address' | 'product_name' | 'date' | 'time' | 'amount' | 'currency' | 'location' | 'organization' | 'custom';
export interface IntentDefinition {
    name: string;
    category: IntentCategory;
    description: string;
    keywords: string[][];
    patterns?: RegExp[];
    examples?: string[];
    workflowId?: string;
    priority?: number;
    requiredEntities?: EntityType[];
    metadata?: Record<string, any>;
}
export interface IntentClassificationResult {
    primaryIntent: Intent;
    alternativeIntents?: Intent[];
    entities: Entity[];
    confidence: number;
    method: ClassificationMethod;
    processingTime?: number;
}
export type ClassificationMethod = 'keyword' | 'pattern' | 'ml' | 'ai' | 'hybrid';
export interface IntentClassifierConfig {
    confidenceThreshold: number;
    maxAlternatives: number;
    useAI: boolean;
    useCaching: boolean;
    fallbackIntent: string;
    enableEntityExtraction: boolean;
}
export interface ClassificationContext {
    userId: number;
    conversationHistory?: string[];
    currentWorkflow?: WorkflowContext;
    userProfile?: Record<string, any>;
    metadata?: Record<string, any>;
}
export interface EntityExtractor {
    type: EntityType;
    extract(text: string, context?: ClassificationContext): Promise<Entity[]>;
}
export interface IntentPattern {
    intentName: string;
    pattern: RegExp;
    priority: number;
    extractEntities?: boolean;
}
//# sourceMappingURL=intent.d.ts.map