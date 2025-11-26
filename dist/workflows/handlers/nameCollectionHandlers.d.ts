import { WorkflowHandler, WorkflowHandlerResult, WorkflowContext } from '../../types/workflow';
export declare class ValidateUserNameHandler implements WorkflowHandler {
    name: string;
    private readonly invalidPatterns;
    execute(context: WorkflowContext, userInput: string): Promise<WorkflowHandlerResult>;
    private cleanName;
}
export declare class SaveUserNameHandler implements WorkflowHandler {
    name: string;
    execute(context: WorkflowContext): Promise<WorkflowHandlerResult>;
}
//# sourceMappingURL=nameCollectionHandlers.d.ts.map