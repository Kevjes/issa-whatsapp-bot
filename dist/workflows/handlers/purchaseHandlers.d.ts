import { WorkflowHandler, WorkflowHandlerResult, WorkflowContext } from '../../types/workflow';
export declare class GeneratePurchaseSummaryHandler implements WorkflowHandler {
    name: string;
    execute(context: WorkflowContext): Promise<WorkflowHandlerResult>;
}
export declare class ProcessSubscriptionHandler implements WorkflowHandler {
    name: string;
    execute(context: WorkflowContext): Promise<WorkflowHandlerResult>;
    private simulateProcessing;
}
//# sourceMappingURL=purchaseHandlers.d.ts.map