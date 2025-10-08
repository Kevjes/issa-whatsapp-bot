/**
 * Export de tous les workflows et handlers
 * Architecture: Domain Layer (Clean Architecture)
 */

import { WorkflowDefinition, WorkflowHandler } from '../types/workflow';
import { nameCollectionWorkflow } from './nameCollectionWorkflow';
import { productPurchaseWorkflow } from './productPurchaseWorkflow';
import {
  ValidateUserNameHandler,
  SaveUserNameHandler
} from './handlers/nameCollectionHandlers';
import {
  GeneratePurchaseSummaryHandler,
  ProcessSubscriptionHandler
} from './handlers/purchaseHandlers';

/**
 * Liste de tous les workflows disponibles
 * IMPORTANT: L'ordre définit la priorité de recherche
 */
export const workflows: WorkflowDefinition[] = [
  nameCollectionWorkflow,      // PRIORITÉ 1: Onboarding (collecte nom)
  productPurchaseWorkflow       // PRIORITÉ 2: Souscription produit
  // Ajouter d'autres workflows ici
];

/**
 * Liste de tous les handlers
 */
export const workflowHandlers: WorkflowHandler[] = [
  // Handlers pour nameCollectionWorkflow
  new ValidateUserNameHandler(),
  new SaveUserNameHandler(),
  // Handlers pour productPurchaseWorkflow
  new GeneratePurchaseSummaryHandler(),
  new ProcessSubscriptionHandler()
  // Ajouter d'autres handlers ici
];

/**
 * Obtenir un workflow par son ID
 */
export function getWorkflowById(id: string): WorkflowDefinition | undefined {
  return workflows.find(w => w.id === id);
}

/**
 * Obtenir un handler par son nom
 */
export function getHandlerByName(name: string): WorkflowHandler | undefined {
  return workflowHandlers.find(h => h.name === name);
}
