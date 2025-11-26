import { WorkflowDefinition, WorkflowContext, WorkflowStepResult, WorkflowHandler, WorkflowState, WorkflowStatus } from '../../types/workflow';
export interface IWorkflowEngine {
    registerWorkflow(workflow: WorkflowDefinition): void;
    registerHandler(handler: WorkflowHandler): void;
    getWorkflow(workflowId: string): WorkflowDefinition | undefined;
    startWorkflow(userId: number, workflowId: string, initialData?: Record<string, any>): Promise<WorkflowContext>;
    getActiveWorkflow(userId: number): Promise<WorkflowContext | null>;
    executeStep(userId: number, context: WorkflowContext, userInput: string): Promise<WorkflowStepResult>;
    getFirstStep(context: WorkflowContext): Promise<WorkflowState>;
    cancelWorkflow(userId: number, reason?: string): Promise<boolean>;
    resumeWorkflow(userId: number): Promise<boolean>;
    rollback(userId: number, steps?: number): Promise<WorkflowStepResult>;
    saveWorkflowContext(userId: number, context: WorkflowContext): Promise<void>;
    loadWorkflowContext(userId: number): Promise<WorkflowContext | null>;
    updateWorkflowStatus(userId: number, status: WorkflowStatus): Promise<void>;
    getAvailableWorkflows(): WorkflowDefinition[];
    hasWorkflow(workflowId: string): boolean;
}
//# sourceMappingURL=IWorkflowEngine.d.ts.map