import { IWorkflowEngine } from '../core/interfaces/IWorkflowEngine';
import { IDatabaseService } from '../core/interfaces/IDatabaseService';
import { WorkflowDefinition, WorkflowContext, WorkflowStepResult, WorkflowHandler, WorkflowState, WorkflowStatus } from '../types/workflow';
export declare class WorkflowEngine implements IWorkflowEngine {
    private workflows;
    private handlers;
    private databaseService;
    constructor(databaseService: IDatabaseService);
    private createStepResult;
    registerWorkflow(workflow: WorkflowDefinition): void;
    registerHandler(handler: WorkflowHandler): void;
    getWorkflow(workflowId: string): WorkflowDefinition | undefined;
    startWorkflow(userId: number, workflowId: string, initialData?: Record<string, any>): Promise<WorkflowContext>;
    getActiveWorkflow(userId: number): Promise<WorkflowContext | null>;
    executeStep(userId: number, context: WorkflowContext, userInput: string): Promise<WorkflowStepResult>;
    private handleInputState;
    private handleValidationState;
    private handleProcessingState;
    private handleOutputState;
    private handleDecisionState;
    private handleAIProcessingState;
    private determineNextState;
    private evaluateCondition;
    private validateInput;
    private renderPrompt;
    private executeHook;
    getFirstStep(context: WorkflowContext): Promise<WorkflowState>;
    cancelWorkflow(userId: number, reason?: string): Promise<boolean>;
    resumeWorkflow(userId: number): Promise<boolean>;
    rollback(userId: number, steps?: number): Promise<WorkflowStepResult>;
    saveWorkflowContext(userId: number, context: WorkflowContext): Promise<void>;
    loadWorkflowContext(userId: number): Promise<WorkflowContext | null>;
    updateWorkflowStatus(userId: number, status: WorkflowStatus): Promise<void>;
    getAvailableWorkflows(): WorkflowDefinition[];
    hasWorkflow(workflowId: string): boolean;
    private validateWorkflowDefinition;
}
//# sourceMappingURL=workflowEngine.d.ts.map