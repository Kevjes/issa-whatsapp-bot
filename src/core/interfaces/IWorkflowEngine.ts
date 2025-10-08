/**
 * Interface pour le moteur de workflow
 * Architecture: Interface Layer (Clean Architecture)
 */

import {
  WorkflowDefinition,
  WorkflowContext,
  WorkflowStepResult,
  WorkflowHandler,
  WorkflowState,
  WorkflowStatus
} from '../../types/workflow';

export interface IWorkflowEngine {
  /**
   * Enregistrer un workflow
   */
  registerWorkflow(workflow: WorkflowDefinition): void;

  /**
   * Enregistrer un handler personnalisé
   */
  registerHandler(handler: WorkflowHandler): void;

  /**
   * Obtenir un workflow par son ID
   */
  getWorkflow(workflowId: string): WorkflowDefinition | undefined;

  /**
   * Démarrer un nouveau workflow pour un utilisateur
   */
  startWorkflow(
    userId: number,
    workflowId: string,
    initialData?: Record<string, any>
  ): Promise<WorkflowContext>;

  /**
   * Obtenir le workflow actif d'un utilisateur
   */
  getActiveWorkflow(userId: number): Promise<WorkflowContext | null>;

  /**
   * Exécuter une étape du workflow
   */
  executeStep(
    userId: number,
    context: WorkflowContext,
    userInput: string
  ): Promise<WorkflowStepResult>;

  /**
   * Obtenir le premier état d'un workflow
   */
  getFirstStep(context: WorkflowContext): Promise<WorkflowState>;

  /**
   * Annuler un workflow
   */
  cancelWorkflow(userId: number, reason?: string): Promise<boolean>;

  /**
   * Reprendre un workflow en pause
   */
  resumeWorkflow(userId: number): Promise<boolean>;

  /**
   * Revenir à l'étape précédente (rollback)
   */
  rollback(userId: number, steps?: number): Promise<WorkflowStepResult>;

  /**
   * Sauvegarder le contexte d'un workflow
   */
  saveWorkflowContext(userId: number, context: WorkflowContext): Promise<void>;

  /**
   * Charger le contexte d'un workflow
   */
  loadWorkflowContext(userId: number): Promise<WorkflowContext | null>;

  /**
   * Mettre à jour le statut d'un workflow
   */
  updateWorkflowStatus(userId: number, status: WorkflowStatus): Promise<void>;

  /**
   * Obtenir tous les workflows disponibles
   */
  getAvailableWorkflows(): WorkflowDefinition[];

  /**
   * Vérifier si un workflow existe
   */
  hasWorkflow(workflowId: string): boolean;
}
