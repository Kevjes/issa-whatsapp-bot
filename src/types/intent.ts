/**
 * Types pour le système de classification d'intentions
 * Architecture: Domain Layer (Clean Architecture)
 */

import { WorkflowContext } from './workflow';

/**
 * Intention détectée
 */
export interface Intent {
  name: string;
  confidence: number; // 0-1
  entities?: Entity[];
  workflowId?: string; // Workflow à déclencher
  category?: IntentCategory;
  metadata?: Record<string, any>;
}

/**
 * Catégories d'intentions
 */
export type IntentCategory =
  | 'greeting'           // Salutation
  | 'product_inquiry'    // Demande d'information produit
  | 'product_purchase'   // Achat/souscription
  | 'complaint'          // Réclamation
  | 'support'            // Support technique
  | 'account_management' // Gestion de compte
  | 'payment'            // Paiement
  | 'cancellation'       // Annulation
  | 'general_question'   // Question générale
  | 'unknown';           // Intention inconnue

/**
 * Entité extraite du message
 */
export interface Entity {
  type: EntityType;
  value: string;
  confidence: number;
  startIndex?: number;
  endIndex?: number;
  metadata?: Record<string, any>;
}

/**
 * Types d'entités
 */
export type EntityType =
  | 'person_name'      // Nom de personne
  | 'phone_number'     // Numéro de téléphone
  | 'email'            // Email
  | 'address'          // Adresse
  | 'product_name'     // Nom de produit
  | 'date'             // Date
  | 'time'             // Heure
  | 'amount'           // Montant
  | 'currency'         // Devise
  | 'location'         // Lieu
  | 'organization'     // Organisation
  | 'custom';          // Entité personnalisée

/**
 * Définition d'une intention
 */
export interface IntentDefinition {
  name: string;
  category: IntentCategory;
  description: string;
  keywords: string[][]; // Groupes de mots-clés (OU entre groupes, ET dans un groupe)
  patterns?: RegExp[]; // Patterns regex
  examples?: string[]; // Exemples de phrases
  workflowId?: string; // Workflow à déclencher
  priority?: number; // Priorité (pour résolution de conflits)
  requiredEntities?: EntityType[]; // Entités requises
  metadata?: Record<string, any>;
}

/**
 * Résultat de classification d'intention
 */
export interface IntentClassificationResult {
  primaryIntent: Intent;
  alternativeIntents?: Intent[]; // Intentions alternatives avec moins de confiance
  entities: Entity[];
  confidence: number;
  method: ClassificationMethod; // Méthode utilisée
  processingTime?: number; // Temps de traitement en ms
}

/**
 * Méthode de classification
 */
export type ClassificationMethod =
  | 'keyword'   // Basé sur mots-clés
  | 'pattern'   // Basé sur patterns regex
  | 'ml'        // Machine learning
  | 'ai'        // IA (GPT/DeepSeek)
  | 'hybrid';   // Combinaison de méthodes

/**
 * Configuration du classificateur d'intentions
 */
export interface IntentClassifierConfig {
  confidenceThreshold: number; // Seuil de confiance minimal (0-1)
  maxAlternatives: number; // Nombre max d'intentions alternatives
  useAI: boolean; // Utiliser l'IA pour classification
  useCaching: boolean; // Cache des classifications
  fallbackIntent: string; // Intention par défaut
  enableEntityExtraction: boolean; // Extraire les entités
}

/**
 * Contexte pour la classification
 */
export interface ClassificationContext {
  userId: number;
  conversationHistory?: string[];
  currentWorkflow?: WorkflowContext;
  userProfile?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Extracteur d'entités
 */
export interface EntityExtractor {
  type: EntityType;
  extract(text: string, context?: ClassificationContext): Promise<Entity[]>;
}

/**
 * Pattern d'intention
 */
export interface IntentPattern {
  intentName: string;
  pattern: RegExp;
  priority: number;
  extractEntities?: boolean;
}
