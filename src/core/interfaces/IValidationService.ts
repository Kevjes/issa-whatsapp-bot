/**
 * Interface pour le service de validation
 * Architecture: Interface Layer (Clean Architecture)
 */

import {
  ValidationRule,
  ValidationResult,
  ValidationSchema,
  CustomValidator,
  ValidationConfig
} from '../../types/validation';

export interface IValidationService {
  /**
   * Valider une valeur avec des règles
   */
  validate(
    value: any,
    rules: ValidationRule[],
    context?: Record<string, any>
  ): Promise<ValidationResult>;

  /**
   * Valider un objet avec un schema
   */
  validateSchema(
    data: Record<string, any>,
    schema: ValidationSchema
  ): Promise<ValidationResult>;

  /**
   * Enregistrer un validateur personnalisé
   */
  registerCustomValidator(validator: CustomValidator): void;

  /**
   * Obtenir un validateur personnalisé
   */
  getCustomValidator(name: string): CustomValidator | undefined;

  /**
   * Mettre à jour la configuration
   */
  updateConfig(config: Partial<ValidationConfig>): void;

  /**
   * Obtenir la configuration actuelle
   */
  getConfig(): ValidationConfig;
}
