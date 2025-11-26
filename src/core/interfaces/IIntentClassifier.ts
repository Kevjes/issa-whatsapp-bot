/**
 * Interface pour le classificateur d'intentions
 * Architecture: Interface Layer (Clean Architecture)
 */

import {
  Intent,
  IntentDefinition,
  IntentClassificationResult,
  IntentClassifierConfig,
  ClassificationContext,
  EntityExtractor
} from '../../types/intent';

export interface IIntentClassifier {
  /**
   * Classifier l'intention d'un message
   */
  classifyIntent(
    message: string,
    context?: ClassificationContext
  ): Promise<IntentClassificationResult>;

  /**
   * Enregistrer une définition d'intention
   */
  registerIntent(intent: IntentDefinition): void;

  /**
   * Enregistrer un extracteur d'entités
   */
  registerEntityExtractor(extractor: EntityExtractor): void;

  /**
   * Obtenir toutes les intentions enregistrées
   */
  getRegisteredIntents(): IntentDefinition[];

  /**
   * Obtenir une intention par son nom
   */
  getIntent(intentName: string): IntentDefinition | undefined;

  /**
   * Mettre à jour la configuration
   */
  updateConfig(config: Partial<IntentClassifierConfig>): void;

  /**
   * Obtenir la configuration actuelle
   */
  getConfig(): IntentClassifierConfig;
}
