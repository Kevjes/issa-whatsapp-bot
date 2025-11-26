/**
 * Service de validation générique
 * Architecture: Application Layer (Clean Architecture)
 */

import { IValidationService } from '../core/interfaces/IValidationService';
import {
  ValidationRule,
  ValidationResult,
  ValidationSchema,
  CustomValidator,
  ValidationConfig,
  ValidationError,
  ValidationType
} from '../types/validation';
import { logger } from '../utils/logger';

export class ValidationService implements IValidationService {
  private customValidators: Map<string, CustomValidator> = new Map();
  private config: ValidationConfig;

  constructor(config?: Partial<ValidationConfig>) {
    this.config = {
      strictMode: config?.strictMode !== undefined ? config.strictMode : false,
      stopOnFirstError: config?.stopOnFirstError !== undefined ? config.stopOnFirstError : true,
      trimStrings: config?.trimStrings !== undefined ? config.trimStrings : true,
      convertTypes: config?.convertTypes !== undefined ? config.convertTypes : true
    };

    logger.info('ValidationService initialized', { config: this.config });
  }

  /**
   * Valider une valeur avec des règles
   */
  async validate(
    value: any,
    rules: ValidationRule[],
    context?: Record<string, any>
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const data: Record<string, any> = {};

    // Pré-traitement de la valeur
    let processedValue = value;
    if (typeof value === 'string' && this.config.trimStrings) {
      processedValue = value.trim();
    }

    for (const rule of rules) {
      try {
        const ruleResult = await this.validateRule(processedValue, rule, context);

        if (!ruleResult.isValid) {
          errors.push({
            field: rule.field,
            type: rule.type,
            message: ruleResult.message || 'Validation failed',
            value: processedValue
          });

          if (this.config.stopOnFirstError) {
            break;
          }
        } else {
          // Stocker la valeur transformée
          data[rule.field] = ruleResult.transformedValue !== undefined
            ? ruleResult.transformedValue
            : processedValue;
        }
      } catch (error) {
        logger.error('Error validating rule', {
          field: rule.field,
          type: rule.type,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        errors.push({
          field: rule.field,
          type: rule.type,
          message: 'Validation error occurred',
          value: processedValue
        });

        if (this.config.stopOnFirstError) {
          break;
        }
      }
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      message: isValid ? 'Validation successful' : errors[0]?.message,
      errors: errors.length > 0 ? errors : undefined,
      data: isValid ? data : undefined
    };
  }

  /**
   * Valider un objet avec un schema
   */
  async validateSchema(
    data: Record<string, any>,
    schema: ValidationSchema
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const validatedData: Record<string, any> = {};

    for (const rule of schema.rules) {
      const fieldValue = data[rule.field];
      const ruleResult = await this.validateRule(fieldValue, rule);

      if (!ruleResult.isValid) {
        errors.push({
          field: rule.field,
          type: rule.type,
          message: ruleResult.message || 'Validation failed',
          value: fieldValue
        });

        if (this.config.stopOnFirstError) {
          break;
        }
      } else {
        validatedData[rule.field] = ruleResult.transformedValue !== undefined
          ? ruleResult.transformedValue
          : fieldValue;
      }
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      message: isValid ? 'Schema validation successful' : errors[0]?.message,
      errors: errors.length > 0 ? errors : undefined,
      data: isValid ? validatedData : undefined
    };
  }

  /**
   * Valider une règle spécifique
   */
  private async validateRule(
    value: any,
    rule: ValidationRule,
    context?: Record<string, any>
  ): Promise<{ isValid: boolean; message?: string; transformedValue?: any }> {
    // Vérifier required
    if (rule.required && (value === undefined || value === null || value === '')) {
      return {
        isValid: false,
        message: rule.message || `${rule.field} est requis`
      };
    }

    // Si la valeur est vide et non requise, c'est valide
    if (!rule.required && (value === undefined || value === null || value === '')) {
      return { isValid: true };
    }

    // Validation selon le type
    switch (rule.type) {
      case 'required':
        return this.validateRequired(value, rule);

      case 'email':
        return this.validateEmail(value, rule);

      case 'phone':
        return this.validatePhone(value, rule);

      case 'number':
        return this.validateNumber(value, rule);

      case 'integer':
        return this.validateInteger(value, rule);

      case 'string':
        return this.validateString(value, rule);

      case 'text':
        return this.validateText(value, rule);

      case 'regex':
        return this.validateRegex(value, rule);

      case 'url':
        return this.validateUrl(value, rule);

      case 'date':
        return this.validateDate(value, rule);

      case 'boolean':
        return this.validateBoolean(value, rule);

      case 'enum':
        return this.validateEnum(value, rule);

      case 'custom':
        return this.validateCustom(value, rule, context);

      default:
        return {
          isValid: false,
          message: `Type de validation non supporté: ${rule.type}`
        };
    }
  }

  private validateRequired(value: any, rule: ValidationRule) {
    const isValid = value !== undefined && value !== null && value !== '';
    return {
      isValid,
      message: isValid ? undefined : (rule.message || 'Ce champ est requis')
    };
  }

  private validateEmail(value: any, rule: ValidationRule) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = typeof value === 'string' && emailRegex.test(value);
    return {
      isValid,
      message: isValid ? undefined : (rule.message || 'Email invalide'),
      transformedValue: isValid ? value.toLowerCase() : value
    };
  }

  private validatePhone(value: any, rule: ValidationRule) {
    // Format camerounais: +237XXXXXXXXX ou 237XXXXXXXXX ou 6XXXXXXXX ou 2XXXXXXXX
    const phoneRegex = /^(?:\+237|237)?[62]\d{8}$/;
    const cleaned = typeof value === 'string' ? value.replace(/[\s-]/g, '') : '';
    const isValid = phoneRegex.test(cleaned);

    return {
      isValid,
      message: isValid ? undefined : (rule.message || 'Numéro de téléphone invalide'),
      transformedValue: isValid ? cleaned : value
    };
  }

  private validateNumber(value: any, rule: ValidationRule) {
    const num = Number(value);
    let isValid = !isNaN(num) && isFinite(num);
    let message: string | undefined;

    if (isValid && rule.min !== undefined && num < rule.min) {
      isValid = false;
      message = rule.message || `La valeur doit être supérieure ou égale à ${rule.min}`;
    }

    if (isValid && rule.max !== undefined && num > rule.max) {
      isValid = false;
      message = rule.message || `La valeur doit être inférieure ou égale à ${rule.max}`;
    }

    return {
      isValid,
      message: isValid ? undefined : (message || 'Nombre invalide'),
      transformedValue: isValid ? num : value
    };
  }

  private validateInteger(value: any, rule: ValidationRule) {
    const num = Number(value);
    let isValid = !isNaN(num) && Number.isInteger(num);
    let message: string | undefined;

    if (isValid && rule.min !== undefined && num < rule.min) {
      isValid = false;
      message = rule.message || `La valeur doit être supérieure ou égale à ${rule.min}`;
    }

    if (isValid && rule.max !== undefined && num > rule.max) {
      isValid = false;
      message = rule.message || `La valeur doit être inférieure ou égale à ${rule.max}`;
    }

    return {
      isValid,
      message: isValid ? undefined : (message || 'Entier invalide'),
      transformedValue: isValid ? num : value
    };
  }

  private validateString(value: any, rule: ValidationRule) {
    const isString = typeof value === 'string';
    let isValid = isString;
    let message: string | undefined;

    if (isValid && rule.min !== undefined && value.length < rule.min) {
      isValid = false;
      message = rule.message || `La longueur minimale est ${rule.min} caractères`;
    }

    if (isValid && rule.max !== undefined && value.length > rule.max) {
      isValid = false;
      message = rule.message || `La longueur maximale est ${rule.max} caractères`;
    }

    return {
      isValid,
      message: isValid ? undefined : (message || 'Chaîne de caractères invalide'),
      transformedValue: isValid && this.config.trimStrings ? value.trim() : value
    };
  }

  private validateText(value: any, rule: ValidationRule) {
    // Texte long (comme string mais avec min/max différents)
    return this.validateString(value, rule);
  }

  private validateRegex(value: any, rule: ValidationRule) {
    if (!rule.pattern) {
      return { isValid: false, message: 'Pattern regex non défini' };
    }

    const regex = new RegExp(rule.pattern);
    const isValid = typeof value === 'string' && regex.test(value);

    return {
      isValid,
      message: isValid ? undefined : (rule.message || 'Format invalide')
    };
  }

  private validateUrl(value: any, rule: ValidationRule) {
    try {
      new URL(value);
      return { isValid: true };
    } catch {
      return {
        isValid: false,
        message: rule.message || 'URL invalide'
      };
    }
  }

  private validateDate(value: any, rule: ValidationRule) {
    const date = new Date(value);
    const isValid = date instanceof Date && !isNaN(date.getTime());

    return {
      isValid,
      message: isValid ? undefined : (rule.message || 'Date invalide'),
      transformedValue: isValid ? date.toISOString() : value
    };
  }

  private validateBoolean(value: any, rule: ValidationRule) {
    // Accepter boolean ou string 'true'/'false' ou 'oui'/'non'
    let transformedValue: boolean;
    let isValid = true;

    if (typeof value === 'boolean') {
      transformedValue = value;
    } else if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'true' || lower === 'oui' || lower === 'yes' || lower === '1') {
        transformedValue = true;
      } else if (lower === 'false' || lower === 'non' || lower === 'no' || lower === '0') {
        transformedValue = false;
      } else {
        isValid = false;
      }
    } else {
      isValid = false;
    }

    return {
      isValid,
      message: isValid ? undefined : (rule.message || 'Valeur booléenne invalide'),
      transformedValue: isValid ? transformedValue! : value
    };
  }

  private validateEnum(value: any, rule: ValidationRule) {
    if (!rule.options || rule.options.length === 0) {
      return { isValid: false, message: 'Options enum non définies' };
    }

    const isValid = rule.options.includes(String(value));

    return {
      isValid,
      message: isValid ? undefined : (rule.message || `Valeur doit être parmi: ${rule.options.join(', ')}`)
    };
  }

  private async validateCustom(
    value: any,
    rule: ValidationRule,
    context?: Record<string, any>
  ) {
    if (!rule.customValidator) {
      return { isValid: false, message: 'Validateur personnalisé non spécifié' };
    }

    const validator = this.customValidators.get(rule.customValidator);
    if (!validator) {
      return { isValid: false, message: `Validateur '${rule.customValidator}' non trouvé` };
    }

    try {
      const result = await validator.validate(value, context);
      return {
        isValid: result.isValid,
        message: result.message,
        transformedValue: result.transformedValue
      };
    } catch (error) {
      logger.error('Error in custom validator', {
        validator: rule.customValidator,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return {
        isValid: false,
        message: 'Erreur lors de la validation personnalisée'
      };
    }
  }

  /**
   * Enregistrer un validateur personnalisé
   */
  registerCustomValidator(validator: CustomValidator): void {
    this.customValidators.set(validator.name, validator);
    logger.debug('Custom validator registered', { name: validator.name });
  }

  /**
   * Obtenir un validateur personnalisé
   */
  getCustomValidator(name: string): CustomValidator | undefined {
    return this.customValidators.get(name);
  }

  /**
   * Mettre à jour la configuration
   */
  updateConfig(config: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('ValidationService config updated', { config: this.config });
  }

  /**
   * Obtenir la configuration actuelle
   */
  getConfig(): ValidationConfig {
    return { ...this.config };
  }
}
