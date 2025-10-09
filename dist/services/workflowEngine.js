"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowEngine = void 0;
const logger_1 = require("../utils/logger");
class WorkflowEngine {
    constructor(databaseService) {
        this.workflows = new Map();
        this.handlers = new Map();
        this.databaseService = databaseService;
        logger_1.logger.info('WorkflowEngine initialized');
    }
    createStepResult(context, success, message, options = {}) {
        return {
            success,
            message,
            context,
            completed: options.completed || false,
            stayInCurrentState: options.stayInCurrentState,
            nextState: options.nextState,
            data: options.data,
            error: options.error
        };
    }
    registerWorkflow(workflow) {
        this.validateWorkflowDefinition(workflow);
        this.workflows.set(workflow.id, workflow);
        logger_1.logger.info('Workflow registered', {
            workflowId: workflow.id,
            name: workflow.name,
            states: workflow.states.length
        });
    }
    registerHandler(handler) {
        this.handlers.set(handler.name, handler);
        logger_1.logger.info('Handler registered', { handlerName: handler.name });
    }
    getWorkflow(workflowId) {
        return this.workflows.get(workflowId);
    }
    async startWorkflow(userId, workflowId, initialData) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }
        if (!workflow.isActive) {
            throw new Error(`Workflow is not active: ${workflowId}`);
        }
        const existingWorkflow = await this.getActiveWorkflow(userId);
        if (existingWorkflow) {
            logger_1.logger.warn('User already has an active workflow', {
                userId,
                existingWorkflowId: existingWorkflow.workflowId,
                newWorkflowId: workflowId
            });
            await this.cancelWorkflow(userId, 'New workflow started');
        }
        const context = {
            userId,
            workflowId,
            currentState: workflow.initialState,
            data: initialData || {},
            history: [],
            metadata: {},
            status: 'active',
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        await this.saveWorkflowContext(userId, context);
        logger_1.logger.info('Workflow started', {
            userId,
            workflowId,
            initialState: workflow.initialState
        });
        return context;
    }
    async getActiveWorkflow(userId) {
        return await this.loadWorkflowContext(userId);
    }
    async executeStep(userId, context, userInput) {
        const startTime = Date.now();
        try {
            const workflow = this.workflows.get(context.workflowId);
            if (!workflow) {
                throw new Error(`Workflow not found: ${context.workflowId}`);
            }
            const currentState = workflow.states.find(s => s.id === context.currentState);
            if (!currentState) {
                throw new Error(`State not found: ${context.currentState}`);
            }
            logger_1.logger.info('Executing workflow step', {
                userId,
                workflowId: context.workflowId,
                currentState: currentState.id,
                stateType: currentState.type
            });
            if (currentState.onEnter) {
                await this.executeHook(currentState.onEnter, context, userInput);
            }
            let result;
            switch (currentState.type) {
                case 'input':
                    result = await this.handleInputState(currentState, context, userInput, workflow);
                    break;
                case 'validation':
                    result = await this.handleValidationState(currentState, context, userInput);
                    break;
                case 'processing':
                    result = await this.handleProcessingState(currentState, context, userInput);
                    break;
                case 'output':
                    result = await this.handleOutputState(currentState, context, userInput);
                    break;
                case 'decision':
                    result = await this.handleDecisionState(currentState, context, userInput, workflow);
                    break;
                case 'ai_processing':
                    result = await this.handleAIProcessingState(currentState, context, userInput);
                    break;
                case 'completed':
                case 'cancelled':
                    result = {
                        success: true,
                        message: 'Workflow terminé',
                        completed: true
                    };
                    break;
                default:
                    result = {
                        success: false,
                        message: 'Type d\'état non supporté',
                        completed: false,
                        error: `Unsupported state type: ${currentState.type}`
                    };
            }
            if (result.success && !result.stayInCurrentState) {
                const nextState = result.nextState || await this.determineNextState(workflow, context, currentState, userInput, result.data || {});
                if (currentState.onExit) {
                    await this.executeHook(currentState.onExit, context, userInput);
                }
                context.currentState = nextState;
                if (result.data) {
                    Object.assign(context.data, result.data);
                }
                const isCompleted = nextState === 'completed' || nextState === 'cancelled';
                if (isCompleted) {
                    context.status = nextState === 'completed' ? 'completed' : 'cancelled';
                    context.completedAt = new Date().toISOString();
                    result.completed = true;
                }
            }
            const durationMs = Date.now() - startTime;
            const step = {
                stateId: currentState.id,
                stateName: currentState.name,
                timestamp: new Date().toISOString(),
                input: userInput,
                output: result.message,
                success: result.success,
                error: result.error,
                durationMs
            };
            context.history.push(step);
            context.updatedAt = new Date().toISOString();
            await this.saveWorkflowContext(userId, context);
            logger_1.logger.info('Workflow step executed', {
                userId,
                workflowId: context.workflowId,
                stateId: currentState.id,
                success: result.success,
                nextState: context.currentState,
                completed: result.completed,
                durationMs
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Error executing workflow step', {
                userId,
                workflowId: context.workflowId,
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            return {
                success: false,
                message: 'Une erreur est survenue lors du traitement de votre demande.',
                completed: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async handleInputState(state, context, userInput, workflow) {
        const lastStep = context.history[context.history.length - 1];
        if (!lastStep || lastStep.stateId !== state.id) {
            const prompt = await this.renderPrompt(state.prompt, context.data);
            return {
                success: true,
                message: prompt,
                completed: false,
                stayInCurrentState: true
            };
        }
        if (state.validation && state.validation.length > 0) {
            const validationResult = await this.validateInput(userInput, state.validation, context);
            if (!validationResult.isValid) {
                return {
                    success: false,
                    message: validationResult.message || 'Entrée invalide',
                    completed: false,
                    stayInCurrentState: true
                };
            }
            return {
                success: true,
                message: '',
                data: validationResult.data,
                completed: false,
                stayInCurrentState: false
            };
        }
        return {
            success: true,
            message: '',
            data: { [state.id]: userInput },
            completed: false,
            stayInCurrentState: false
        };
    }
    async handleValidationState(state, context, userInput) {
        if (state.validation && state.validation.length > 0) {
            const validationResult = await this.validateInput(userInput, state.validation, context);
            if (!validationResult.isValid) {
                const prompt = await this.renderPrompt(state.prompt, context.data);
                return {
                    success: false,
                    message: `${validationResult.message}\n\n${prompt}`,
                    completed: false,
                    stayInCurrentState: true
                };
            }
            return {
                success: true,
                data: validationResult.data,
                message: 'Validation réussie',
                completed: false
            };
        }
        return {
            success: true,
            message: '',
            completed: false
        };
    }
    async handleProcessingState(state, context, userInput) {
        if (state.handler) {
            const handler = this.handlers.get(state.handler);
            if (handler) {
                const handlerResult = await handler.execute(context, userInput);
                if (!handlerResult.success) {
                    return {
                        success: false,
                        message: handlerResult.error || 'Erreur lors du traitement',
                        completed: false,
                        error: handlerResult.error
                    };
                }
                return {
                    success: true,
                    message: handlerResult.output || '',
                    data: handlerResult.data,
                    nextState: handlerResult.nextState,
                    completed: false
                };
            }
        }
        const prompt = await this.renderPrompt(state.prompt, context.data);
        return {
            success: true,
            message: prompt,
            completed: false
        };
    }
    async handleOutputState(state, context, userInput) {
        let message;
        if (state.handler) {
            const handler = this.handlers.get(state.handler);
            if (handler) {
                const handlerResult = await handler.execute(context, userInput);
                message = handlerResult.output;
            }
        }
        if (!message) {
            message = await this.renderPrompt(state.prompt, context.data);
        }
        return {
            success: true,
            message,
            completed: false
        };
    }
    async handleDecisionState(state, context, userInput, workflow) {
        const lastStep = context.history[context.history.length - 1];
        if (!lastStep || lastStep.stateId !== state.id) {
            const prompt = await this.renderPrompt(state.prompt, context.data);
            return {
                success: true,
                message: prompt,
                completed: false,
                stayInCurrentState: true
            };
        }
        if (state.validation) {
            const validationResult = await this.validateInput(userInput, state.validation, context);
            if (!validationResult.isValid) {
                return {
                    success: false,
                    message: validationResult.message || 'Choix invalide',
                    completed: false,
                    stayInCurrentState: true
                };
            }
            return {
                success: true,
                message: '',
                data: validationResult.data,
                completed: false
            };
        }
        return {
            success: true,
            message: '',
            data: { decision: userInput },
            completed: false
        };
    }
    async handleAIProcessingState(state, context, userInput) {
        if (state.handler) {
            const handler = this.handlers.get(state.handler);
            if (handler) {
                const handlerResult = await handler.execute(context, userInput);
                return {
                    success: handlerResult.success,
                    message: handlerResult.output || '',
                    data: handlerResult.data,
                    error: handlerResult.error,
                    completed: false
                };
            }
        }
        return {
            success: true,
            message: 'Traitement IA en cours...',
            completed: false
        };
    }
    async determineNextState(workflow, context, currentState, userInput, stepData) {
        const evaluationData = { ...context.data, ...stepData };
        const transitions = workflow.transitions
            .filter(t => t.from === currentState.id)
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));
        for (const transition of transitions) {
            if (transition.condition) {
                const conditionMet = await this.evaluateCondition(transition.condition, evaluationData, userInput);
                if (conditionMet) {
                    logger_1.logger.debug('Transition condition met', {
                        from: transition.from,
                        to: transition.to,
                        condition: transition.condition
                    });
                    return transition.to;
                }
            }
            else {
                return transition.to;
            }
        }
        if (currentState.nextState) {
            return currentState.nextState;
        }
        return 'completed';
    }
    async evaluateCondition(condition, data, userInput) {
        try {
            let evaluableCondition = condition;
            const dataMatches = condition.match(/data\.(\w+)/g);
            if (dataMatches) {
                for (const match of dataMatches) {
                    const field = match.replace('data.', '');
                    const value = data[field];
                    const replacement = typeof value === 'string' ? `'${value}'` : String(value);
                    evaluableCondition = evaluableCondition.replace(match, replacement);
                }
            }
            return eval(evaluableCondition);
        }
        catch (error) {
            logger_1.logger.error('Error evaluating condition', {
                condition,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }
    async validateInput(input, rules, context) {
        const data = {};
        for (const rule of rules) {
            if (rule.type === 'required' && !input.trim()) {
                return {
                    isValid: false,
                    message: rule.message || 'Ce champ est requis'
                };
            }
            if (rule.type === 'regex' && rule.pattern) {
                const regex = new RegExp(rule.pattern);
                if (!regex.test(input)) {
                    return {
                        isValid: false,
                        message: rule.message || 'Format invalide'
                    };
                }
            }
            data[rule.field] = input;
        }
        return {
            isValid: true,
            data
        };
    }
    async renderPrompt(prompt, data) {
        if (!prompt) {
            return '';
        }
        if (typeof prompt === 'string') {
            let rendered = prompt;
            const matches = prompt.match(/\{\{(\w+)\}\}/g);
            if (matches) {
                for (const match of matches) {
                    const variable = match.replace('{{', '').replace('}}', '');
                    const value = data[variable] || '';
                    rendered = rendered.replace(match, value);
                }
            }
            return rendered;
        }
        if (prompt.template) {
            return this.renderPrompt(prompt.template, data);
        }
        return String(prompt);
    }
    async executeHook(hookName, context, userInput) {
        const handler = this.handlers.get(hookName);
        if (handler) {
            try {
                await handler.execute(context, userInput);
            }
            catch (error) {
                logger_1.logger.error('Error executing hook', {
                    hookName,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
    }
    async getFirstStep(context) {
        const workflow = this.workflows.get(context.workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${context.workflowId}`);
        }
        const firstState = workflow.states.find(s => s.id === workflow.initialState);
        if (!firstState) {
            throw new Error(`Initial state not found: ${workflow.initialState}`);
        }
        return firstState;
    }
    async cancelWorkflow(userId, reason) {
        try {
            const context = await this.loadWorkflowContext(userId);
            if (!context) {
                return false;
            }
            context.status = 'cancelled';
            context.completedAt = new Date().toISOString();
            context.errorMessage = reason;
            context.updatedAt = new Date().toISOString();
            await this.saveWorkflowContext(userId, context);
            logger_1.logger.info('Workflow cancelled', { userId, workflowId: context.workflowId, reason });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error cancelling workflow', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }
    async resumeWorkflow(userId) {
        try {
            const context = await this.loadWorkflowContext(userId);
            if (!context || context.status !== 'paused') {
                return false;
            }
            context.status = 'active';
            context.updatedAt = new Date().toISOString();
            await this.saveWorkflowContext(userId, context);
            logger_1.logger.info('Workflow resumed', { userId, workflowId: context.workflowId });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error resuming workflow', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }
    async rollback(userId, steps = 1) {
        try {
            const context = await this.loadWorkflowContext(userId);
            if (!context || context.history.length === 0) {
                return {
                    success: false,
                    message: 'Impossible de revenir en arrière',
                    completed: false,
                    error: 'No history available'
                };
            }
            const stepsToRemove = Math.min(steps, context.history.length);
            context.history.splice(-stepsToRemove);
            if (context.history.length > 0) {
                const lastStep = context.history[context.history.length - 1];
                context.currentState = lastStep.stateId;
            }
            else {
                const workflow = this.workflows.get(context.workflowId);
                if (workflow) {
                    context.currentState = workflow.initialState;
                }
            }
            context.updatedAt = new Date().toISOString();
            await this.saveWorkflowContext(userId, context);
            logger_1.logger.info('Workflow rolled back', {
                userId,
                workflowId: context.workflowId,
                steps: stepsToRemove,
                newState: context.currentState
            });
            const workflow = this.workflows.get(context.workflowId);
            const currentState = workflow?.states.find(s => s.id === context.currentState);
            const prompt = currentState ? await this.renderPrompt(currentState.prompt, context.data) : '';
            return {
                success: true,
                message: prompt || 'Retour en arrière effectué',
                completed: false
            };
        }
        catch (error) {
            logger_1.logger.error('Error rolling back workflow', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                message: 'Erreur lors du retour en arrière',
                completed: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async saveWorkflowContext(userId, context) {
        try {
            await this.databaseService.saveWorkflowContext(userId, context);
        }
        catch (error) {
            logger_1.logger.error('Error saving workflow context', {
                userId,
                workflowId: context.workflowId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async loadWorkflowContext(userId) {
        try {
            return await this.databaseService.loadWorkflowContext(userId);
        }
        catch (error) {
            logger_1.logger.error('Error loading workflow context', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return null;
        }
    }
    async updateWorkflowStatus(userId, status) {
        try {
            const context = await this.loadWorkflowContext(userId);
            if (context) {
                context.status = status;
                context.updatedAt = new Date().toISOString();
                if (status === 'completed' || status === 'cancelled' || status === 'failed') {
                    context.completedAt = new Date().toISOString();
                }
                await this.saveWorkflowContext(userId, context);
            }
        }
        catch (error) {
            logger_1.logger.error('Error updating workflow status', {
                userId,
                status,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    getAvailableWorkflows() {
        return Array.from(this.workflows.values()).filter(w => w.isActive);
    }
    hasWorkflow(workflowId) {
        return this.workflows.has(workflowId);
    }
    validateWorkflowDefinition(workflow) {
        if (!workflow.id || !workflow.name) {
            throw new Error('Workflow must have id and name');
        }
        if (!workflow.initialState) {
            throw new Error('Workflow must have an initial state');
        }
        if (!workflow.states || workflow.states.length === 0) {
            throw new Error('Workflow must have at least one state');
        }
        const initialStateExists = workflow.states.some(s => s.id === workflow.initialState);
        if (!initialStateExists) {
            throw new Error(`Initial state '${workflow.initialState}' not found in states`);
        }
        for (const transition of workflow.transitions) {
            const fromExists = workflow.states.some(s => s.id === transition.from);
            const toExists = workflow.states.some(s => s.id === transition.to);
            if (!fromExists) {
                throw new Error(`Transition from state '${transition.from}' not found`);
            }
            if (!toExists) {
                throw new Error(`Transition to state '${transition.to}' not found`);
            }
        }
    }
}
exports.WorkflowEngine = WorkflowEngine;
//# sourceMappingURL=workflowEngine.js.map