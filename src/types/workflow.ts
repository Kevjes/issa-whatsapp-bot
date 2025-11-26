/**
 * Types pour le système de workflow
 * Architecture: Domain Layer (Clean Architecture)
 */

import { ValidationRule } from './validation';

/**
 * Définition complète d'un workflow
 */
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

/**
 * État dans un workflow
 */
export interface WorkflowState {
  id: string;
  name: string;
  type: WorkflowStateType;
  handler?: string; // Nom du handler à appeler
  validation?: ValidationRule[];
  prompt?: string | PromptTemplate; // Message à afficher (peut contenir des variables)
  nextState?: string; // État par défaut si pas de transition spécifique
  timeout?: number; // Timeout en secondes (optionnel)
  metadata?: Record<string, any>;
  onEnter?: string; // Hook appelé à l'entrée dans l'état
  onExit?: string; // Hook appelé à la sortie de l'état
}

/**
 * Types d'états possibles
 */
export type WorkflowStateType =
  | 'input'        // Attend une entrée utilisateur
  | 'validation'   // Valide des données
  | 'processing'   // Traitement (appel API, calcul, etc.)
  | 'output'       // Affiche un message
  | 'decision'     // Prend une décision (condition)
  | 'ai_processing' // Traitement par IA
  | 'wait'         // Attend un événement externe
  | 'completed'    // État final de succès
  | 'cancelled';   // État final d'annulation

/**
 * Transition entre états
 */
export interface WorkflowTransition {
  id?: string;
  from: string;
  to: string;
  condition?: string; // Expression à évaluer (ex: "data.age >= 18")
  trigger?: string; // Événement déclencheur
  priority?: number; // Priorité (pour multiples transitions)
  metadata?: Record<string, any>;
}

/**
 * Contexte d'exécution d'un workflow pour un utilisateur
 */
export interface WorkflowContext {
  id?: number; // ID en base de données
  userId: number;
  workflowId: string;
  currentState: string;
  data: Record<string, any>; // Données collectées durant le workflow
  history: WorkflowStep[]; // Historique des étapes
  metadata: Record<string, any>;
  status: WorkflowStatus;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

/**
 * Status d'un workflow
 */
export type WorkflowStatus =
  | 'active'      // En cours d'exécution
  | 'paused'      // En pause
  | 'completed'   // Terminé avec succès
  | 'cancelled'   // Annulé
  | 'failed';     // Échoué

/**
 * Étape dans l'historique du workflow
 */
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

/**
 * Résultat de l'exécution d'une étape
 */
export interface WorkflowStepResult {
  success: boolean;
  message: string;
  context?: WorkflowContext; // Contexte mis à jour (peut être omis dans certains cas)
  nextState?: string;
  completed: boolean;
  stayInCurrentState?: boolean; // Si true, reste dans l'état actuel (validation échouée par exemple)
  data?: Record<string, any>; // Données à ajouter au contexte
  error?: string;
}

/**
 * Template de prompt avec variables
 */
export interface PromptTemplate {
  template: string; // "Bonjour {{name}}, comment puis-je vous aider ?"
  variables?: string[]; // ["name"]
}

/**
 * Handler de workflow (logique métier)
 */
export interface WorkflowHandler {
  name: string;
  execute(context: WorkflowContext, userInput?: string): Promise<WorkflowHandlerResult>;
}

/**
 * Résultat d'un handler
 */
export interface WorkflowHandlerResult {
  success: boolean;
  output?: string;
  data?: Record<string, any>;
  error?: string;
  nextState?: string;
}

/**
 * Configuration d'un workflow
 */
export interface WorkflowConfig {
  maxStepsPerSession?: number; // Nombre max d'étapes par session
  defaultTimeout?: number; // Timeout par défaut en secondes
  allowRollback?: boolean; // Permet le retour en arrière
  saveHistory?: boolean; // Sauvegarde l'historique
  enableLogging?: boolean; // Active le logging détaillé
}

/**
 * Événement de workflow
 */
export interface WorkflowEvent {
  type: WorkflowEventType;
  workflowId: string;
  contextId: number;
  userId: number;
  stateId?: string;
  timestamp: string;
  data?: Record<string, any>;
}

/**
 * Types d'événements de workflow
 */
export type WorkflowEventType =
  | 'workflow_started'
  | 'workflow_completed'
  | 'workflow_cancelled'
  | 'workflow_failed'
  | 'state_entered'
  | 'state_exited'
  | 'validation_failed'
  | 'handler_error';
