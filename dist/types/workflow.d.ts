import { ValidationRule } from './validation';
export interface WorkflowDefinition {
    id: string;
    name: string;
    description: string;
    version: string;
    initialState: string;
    states: WorkflowState[];
    transitions: WorkflowTransition[];
    metadata?: Record<string, any>;
    createdAt?: string;
    updatedAt?: string;
    isActive: boolean;
}
export interface WorkflowState {
    id: string;
    name: string;
    type: WorkflowStateType;
    handler?: string;
    validation?: ValidationRule[];
    prompt?: string | PromptTemplate;
    nextState?: string;
    timeout?: number;
    metadata?: Record<string, any>;
    onEnter?: string;
    onExit?: string;
}
export type WorkflowStateType = 'input' | 'validation' | 'processing' | 'output' | 'decision' | 'ai_processing' | 'wait' | 'completed' | 'cancelled';
export interface WorkflowTransition {
    id?: string;
    from: string;
    to: string;
    condition?: string;
    trigger?: string;
    priority?: number;
    metadata?: Record<string, any>;
}
export interface WorkflowContext {
    id?: number;
    userId: number;
    workflowId: string;
    currentState: string;
    data: Record<string, any>;
    history: WorkflowStep[];
    metadata: Record<string, any>;
    status: WorkflowStatus;
    startedAt: string;
    updatedAt: string;
    completedAt?: string;
    errorMessage?: string;
}
export type WorkflowStatus = 'active' | 'paused' | 'completed' | 'cancelled' | 'failed';
export interface WorkflowStep {
    stateId: string;
    stateName?: string;
    timestamp: string;
    input?: string;
    output?: string;
    success: boolean;
    error?: string;
    metadata?: Record<string, any>;
    durationMs?: number;
}
export interface WorkflowStepResult {
    success: boolean;
    message: string;
    context?: WorkflowContext;
    nextState?: string;
    completed: boolean;
    stayInCurrentState?: boolean;
    data?: Record<string, any>;
    error?: string;
}
export interface PromptTemplate {
    template: string;
    variables?: string[];
}
export interface WorkflowHandler {
    name: string;
    execute(context: WorkflowContext, userInput?: string): Promise<WorkflowHandlerResult>;
}
export interface WorkflowHandlerResult {
    success: boolean;
    output?: string;
    data?: Record<string, any>;
    error?: string;
    nextState?: string;
}
export interface WorkflowConfig {
    maxStepsPerSession?: number;
    defaultTimeout?: number;
    allowRollback?: boolean;
    saveHistory?: boolean;
    enableLogging?: boolean;
}
export interface WorkflowEvent {
    type: WorkflowEventType;
    workflowId: string;
    contextId: number;
    userId: number;
    stateId?: string;
    timestamp: string;
    data?: Record<string, any>;
}
export type WorkflowEventType = 'workflow_started' | 'workflow_completed' | 'workflow_cancelled' | 'workflow_failed' | 'state_entered' | 'state_exited' | 'validation_failed' | 'handler_error';
//# sourceMappingURL=workflow.d.ts.map