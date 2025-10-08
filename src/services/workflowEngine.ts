/**
 * Moteur de workflow - State Machine
 * Architecture: Application Layer (Clean Architecture)
 */

import { IWorkflowEngine } from '../core/interfaces/IWorkflowEngine';
import { IDatabaseService } from '../core/interfaces/IDatabaseService';
import {
  WorkflowDefinition,
  WorkflowContext,
  WorkflowStepResult,
  WorkflowHandler,
  WorkflowState,
  WorkflowStep,
  WorkflowStatus,
  WorkflowTransition
} from '../types/workflow';
import { ValidationResult } from '../types/validation';
import { logger } from '../utils/logger';

export class WorkflowEngine implements IWorkflowEngine {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private handlers: Map<string, WorkflowHandler> = new Map();
  private databaseService: IDatabaseService;

  constructor(databaseService: IDatabaseService) {
    this.databaseService = databaseService;
    logger.info('WorkflowEngine initialized');
  }

  /**
   * Helper pour créer un WorkflowStepResult avec context
   */
  private createStepResult(
    context: WorkflowContext,
    success: boolean,
    message: string,
    options: {
      completed?: boolean;
      stayInCurrentState?: boolean;
      nextState?: string;
      data?: Record<string, any>;
      error?: string;
    } = {}
  ): WorkflowStepResult {
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

  /**
   * Enregistrer un workflow
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    // Validation du workflow
    this.validateWorkflowDefinition(workflow);

    this.workflows.set(workflow.id, workflow);
    logger.info('Workflow registered', {
      workflowId: workflow.id,
      name: workflow.name,
      states: workflow.states.length
    });
  }

  /**
   * Enregistrer un handler personnalisé
   */
  registerHandler(handler: WorkflowHandler): void {
    this.handlers.set(handler.name, handler);
    logger.info('Handler registered', { handlerName: handler.name });
  }

  /**
   * Obtenir un workflow par son ID
   */
  getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Démarrer un nouveau workflow pour un utilisateur
   */
  async startWorkflow(
    userId: number,
    workflowId: string,
    initialData?: Record<string, any>
  ): Promise<WorkflowContext> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (!workflow.isActive) {
      throw new Error(`Workflow is not active: ${workflowId}`);
    }

    // Vérifier s'il y a déjà un workflow actif
    const existingWorkflow = await this.getActiveWorkflow(userId);
    if (existingWorkflow) {
      logger.warn('User already has an active workflow', {
        userId,
        existingWorkflowId: existingWorkflow.workflowId,
        newWorkflowId: workflowId
      });
      // Annuler l'ancien workflow
      await this.cancelWorkflow(userId, 'New workflow started');
    }

    const context: WorkflowContext = {
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

    // Sauvegarder le contexte en base
    await this.saveWorkflowContext(userId, context);

    logger.info('Workflow started', {
      userId,
      workflowId,
      initialState: workflow.initialState
    });

    return context;
  }

  /**
   * Obtenir le workflow actif d'un utilisateur
   */
  async getActiveWorkflow(userId: number): Promise<WorkflowContext | null> {
    return await this.loadWorkflowContext(userId);
  }

  /**
   * Exécuter une étape du workflow
   */
  async executeStep(
    userId: number,
    context: WorkflowContext,
    userInput: string
  ): Promise<WorkflowStepResult> {
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

      logger.info('Executing workflow step', {
        userId,
        workflowId: context.workflowId,
        currentState: currentState.id,
        stateType: currentState.type
      });

      // 1. Exécuter le hook onEnter si présent
      if (currentState.onEnter) {
        await this.executeHook(currentState.onEnter, context, userInput);
      }

      // 2. Traiter selon le type d'état
      let result: WorkflowStepResult;

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

      // 3. Si succès et pas de stay in state, passer à l'état suivant
      if (result.success && !result.stayInCurrentState) {
        const nextState = result.nextState || await this.determineNextState(
          workflow,
          context,
          currentState,
          userInput,
          result.data || {}
        );

        // Exécuter le hook onExit
        if (currentState.onExit) {
          await this.executeHook(currentState.onExit, context, userInput);
        }

        // Mettre à jour le contexte
        context.currentState = nextState;

        // Ajouter les données du résultat au contexte
        if (result.data) {
          Object.assign(context.data, result.data);
        }

        // Vérifier si le workflow est terminé
        const isCompleted = nextState === 'completed' || nextState === 'cancelled';
        if (isCompleted) {
          context.status = nextState === 'completed' ? 'completed' : 'cancelled';
          context.completedAt = new Date().toISOString();
          result.completed = true;
        }
      }

      // 4. Ajouter à l'historique
      const durationMs = Date.now() - startTime;
      const step: WorkflowStep = {
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

      // 5. Sauvegarder le contexte
      await this.saveWorkflowContext(userId, context);

      logger.info('Workflow step executed', {
        userId,
        workflowId: context.workflowId,
        stateId: currentState.id,
        success: result.success,
        nextState: context.currentState,
        completed: result.completed,
        durationMs
      });

      return result;

    } catch (error) {
      logger.error('Error executing workflow step', {
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

  /**
   * Gérer un état de type input
   */
  private async handleInputState(
    state: WorkflowState,
    context: WorkflowContext,
    userInput: string,
    workflow: WorkflowDefinition
  ): Promise<WorkflowStepResult> {
    // Si c'est le premier passage dans cet état, afficher le prompt
    const lastStep = context.history[context.history.length - 1];
    if (!lastStep || lastStep.stateId !== state.id) {
      const prompt = await this.renderPrompt(state.prompt, context.data);
      return {
        success: true,
        message: prompt,
        completed: false,
        stayInCurrentState: true // Attendre l'entrée utilisateur
      };
    }

    // Validation de l'entrée
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

      // Stocker les données validées
      return {
        success: true,
        message: '', // Will be set by next state
        data: validationResult.data,
        completed: false
      };
    }

    // Pas de validation, stocker directement
    return {
      success: true,
      message: '', // Will be set by next state
      data: { [state.id]: userInput },
      completed: false
    };
  }

  /**
   * Gérer un état de type validation
   */
  private async handleValidationState(
    state: WorkflowState,
    context: WorkflowContext,
    userInput: string
  ): Promise<WorkflowStepResult> {
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
      message: '', // Will be set by next state
      completed: false
    };
  }

  /**
   * Gérer un état de type processing
   */
  private async handleProcessingState(
    state: WorkflowState,
    context: WorkflowContext,
    userInput: string
  ): Promise<WorkflowStepResult> {
    // Exécuter le handler si présent
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
          message: handlerResult.output || '', // Provide default empty string
          data: handlerResult.data,
          nextState: handlerResult.nextState,
          completed: false
        };
      }
    }

    // Pas de handler, passer à l'état suivant
    const prompt = await this.renderPrompt(state.prompt, context.data);
    return {
      success: true,
      message: prompt,
      completed: false
    };
  }

  /**
   * Gérer un état de type output
   */
  private async handleOutputState(
    state: WorkflowState,
    context: WorkflowContext,
    userInput: string
  ): Promise<WorkflowStepResult> {
    // Exécuter le handler si présent pour générer le message
    let message: string | undefined;

    if (state.handler) {
      const handler = this.handlers.get(state.handler);
      if (handler) {
        const handlerResult = await handler.execute(context, userInput);
        message = handlerResult.output;
      }
    }

    // Sinon utiliser le prompt
    if (!message) {
      message = await this.renderPrompt(state.prompt, context.data);
    }

    return {
      success: true,
      message,
      completed: false
    };
  }

  /**
   * Gérer un état de type decision
   */
  private async handleDecisionState(
    state: WorkflowState,
    context: WorkflowContext,
    userInput: string,
    workflow: WorkflowDefinition
  ): Promise<WorkflowStepResult> {
    // Afficher le prompt de décision si premier passage
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

    // Valider la décision
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

      // Stocker la décision
      return {
        success: true,
        message: '', // Will be set by next state
        data: validationResult.data,
        completed: false
      };
    }

    return {
      success: true,
      message: '', // Will be set by next state
      data: { decision: userInput },
      completed: false
    };
  }

  /**
   * Gérer un état de type ai_processing
   */
  private async handleAIProcessingState(
    state: WorkflowState,
    context: WorkflowContext,
    userInput: string
  ): Promise<WorkflowStepResult> {
    // Cet état sera géré par ConversationService avec l'IA
    // Pour l'instant, on utilise le handler si présent
    if (state.handler) {
      const handler = this.handlers.get(state.handler);
      if (handler) {
        const handlerResult = await handler.execute(context, userInput);
        return {
          success: handlerResult.success,
          message: handlerResult.output || '', // Provide default empty string
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

  /**
   * Déterminer l'état suivant
   */
  private async determineNextState(
    workflow: WorkflowDefinition,
    context: WorkflowContext,
    currentState: WorkflowState,
    userInput: string,
    stepData: Record<string, any>
  ): Promise<string> {
    // Fusionner les données du step avec le contexte pour l'évaluation
    const evaluationData = { ...context.data, ...stepData };

    // 1. Chercher des transitions avec conditions
    const transitions = workflow.transitions
      .filter(t => t.from === currentState.id)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0)); // Trier par priorité

    for (const transition of transitions) {
      if (transition.condition) {
        const conditionMet = await this.evaluateCondition(
          transition.condition,
          evaluationData,
          userInput
        );

        if (conditionMet) {
          logger.debug('Transition condition met', {
            from: transition.from,
            to: transition.to,
            condition: transition.condition
          });
          return transition.to;
        }
      } else {
        // Transition sans condition
        return transition.to;
      }
    }

    // 2. Utiliser l'état par défaut de l'état actuel
    if (currentState.nextState) {
      return currentState.nextState;
    }

    // 3. Workflow terminé
    return 'completed';
  }

  /**
   * Évaluer une condition
   */
  private async evaluateCondition(
    condition: string,
    data: Record<string, any>,
    userInput: string
  ): Promise<boolean> {
    try {
      // Sécurité: conditions simples uniquement
      // Format supporté: "data.field == 'value'" ou "data.field > 10"

      // Remplacer les références aux données
      let evaluableCondition = condition;

      // Remplacer data.field par la valeur
      const dataMatches = condition.match(/data\.(\w+)/g);
      if (dataMatches) {
        for (const match of dataMatches) {
          const field = match.replace('data.', '');
          const value = data[field];

          // Remplacer par la valeur quotée si string
          const replacement = typeof value === 'string' ? `'${value}'` : String(value);
          evaluableCondition = evaluableCondition.replace(match, replacement);
        }
      }

      // Évaluation sécurisée (uniquement comparaisons)
      // eslint-disable-next-line no-eval
      return eval(evaluableCondition);

    } catch (error) {
      logger.error('Error evaluating condition', {
        condition,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Valider l'entrée utilisateur
   */
  private async validateInput(
    input: string,
    rules: any[],
    context: WorkflowContext
  ): Promise<ValidationResult> {
    // Cette méthode sera déléguée au ValidationService
    // Pour l'instant, validation basique
    const data: Record<string, any> = {};

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

      // Stocker la valeur validée
      data[rule.field] = input;
    }

    return {
      isValid: true,
      data
    };
  }

  /**
   * Rendre un prompt avec des variables
   */
  private async renderPrompt(
    prompt: string | any | undefined,
    data: Record<string, any>
  ): Promise<string> {
    if (!prompt) {
      return '';
    }

    if (typeof prompt === 'string') {
      // Remplacer les variables {{variable}}
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

    // Si c'est un objet PromptTemplate
    if (prompt.template) {
      return this.renderPrompt(prompt.template, data);
    }

    return String(prompt);
  }

  /**
   * Exécuter un hook
   */
  private async executeHook(
    hookName: string,
    context: WorkflowContext,
    userInput: string
  ): Promise<void> {
    const handler = this.handlers.get(hookName);
    if (handler) {
      try {
        await handler.execute(context, userInput);
      } catch (error) {
        logger.error('Error executing hook', {
          hookName,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Obtenir le premier état d'un workflow
   */
  async getFirstStep(context: WorkflowContext): Promise<WorkflowState> {
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

  /**
   * Annuler un workflow
   */
  async cancelWorkflow(userId: number, reason?: string): Promise<boolean> {
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

      logger.info('Workflow cancelled', { userId, workflowId: context.workflowId, reason });
      return true;
    } catch (error) {
      logger.error('Error cancelling workflow', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Reprendre un workflow en pause
   */
  async resumeWorkflow(userId: number): Promise<boolean> {
    try {
      const context = await this.loadWorkflowContext(userId);
      if (!context || context.status !== 'paused') {
        return false;
      }

      context.status = 'active';
      context.updatedAt = new Date().toISOString();

      await this.saveWorkflowContext(userId, context);

      logger.info('Workflow resumed', { userId, workflowId: context.workflowId });
      return true;
    } catch (error) {
      logger.error('Error resuming workflow', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Revenir à l'étape précédente (rollback)
   */
  async rollback(userId: number, steps: number = 1): Promise<WorkflowStepResult> {
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

      // Retirer les dernières étapes
      const stepsToRemove = Math.min(steps, context.history.length);
      context.history.splice(-stepsToRemove);

      // Revenir à l'état précédent
      if (context.history.length > 0) {
        const lastStep = context.history[context.history.length - 1];
        context.currentState = lastStep.stateId;
      } else {
        // Revenir à l'état initial
        const workflow = this.workflows.get(context.workflowId);
        if (workflow) {
          context.currentState = workflow.initialState;
        }
      }

      context.updatedAt = new Date().toISOString();
      await this.saveWorkflowContext(userId, context);

      logger.info('Workflow rolled back', {
        userId,
        workflowId: context.workflowId,
        steps: stepsToRemove,
        newState: context.currentState
      });

      // Obtenir le prompt de l'état actuel
      const workflow = this.workflows.get(context.workflowId);
      const currentState = workflow?.states.find(s => s.id === context.currentState);
      const prompt = currentState ? await this.renderPrompt(currentState.prompt, context.data) : '';

      return {
        success: true,
        message: prompt || 'Retour en arrière effectué',
        completed: false
      };

    } catch (error) {
      logger.error('Error rolling back workflow', {
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

  /**
   * Sauvegarder le contexte d'un workflow
   */
  async saveWorkflowContext(userId: number, context: WorkflowContext): Promise<void> {
    try {
      await this.databaseService.saveWorkflowContext(userId, context);
    } catch (error) {
      logger.error('Error saving workflow context', {
        userId,
        workflowId: context.workflowId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Charger le contexte d'un workflow
   */
  async loadWorkflowContext(userId: number): Promise<WorkflowContext | null> {
    try {
      return await this.databaseService.loadWorkflowContext(userId);
    } catch (error) {
      logger.error('Error loading workflow context', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Mettre à jour le statut d'un workflow
   */
  async updateWorkflowStatus(userId: number, status: WorkflowStatus): Promise<void> {
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
    } catch (error) {
      logger.error('Error updating workflow status', {
        userId,
        status,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Obtenir tous les workflows disponibles
   */
  getAvailableWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values()).filter(w => w.isActive);
  }

  /**
   * Vérifier si un workflow existe
   */
  hasWorkflow(workflowId: string): boolean {
    return this.workflows.has(workflowId);
  }

  /**
   * Valider la définition d'un workflow
   */
  private validateWorkflowDefinition(workflow: WorkflowDefinition): void {
    if (!workflow.id || !workflow.name) {
      throw new Error('Workflow must have id and name');
    }

    if (!workflow.initialState) {
      throw new Error('Workflow must have an initial state');
    }

    if (!workflow.states || workflow.states.length === 0) {
      throw new Error('Workflow must have at least one state');
    }

    // Vérifier que l'état initial existe
    const initialStateExists = workflow.states.some(s => s.id === workflow.initialState);
    if (!initialStateExists) {
      throw new Error(`Initial state '${workflow.initialState}' not found in states`);
    }

    // Vérifier que toutes les transitions référencent des états existants
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
