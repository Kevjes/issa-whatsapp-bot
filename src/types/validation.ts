/**
 * Types pour le système de validation
 * Architecture: Domain Layer (Clean Architecture)
 */

/**
 * Règle de validation
 */
export interface ValidationRule {
  field: string; // Nom du champ à valider
  type: ValidationType;
  required?: boolean;
  pattern?: string; // Regex pattern
  min?: number; // Longueur min ou valeur min
  max?: number; // Longueur max ou valeur max
  message?: string; // Message d'erreur personnalisé
  customValidator?: string; // Nom d'un validateur personnalisé
  options?: string[]; // Options valides (pour enum)
  metadata?: Record<string, any>;
}

/**
 * Types de validation supportés
 */
export type ValidationType =
  | 'required'     // Champ requis
  | 'email'        // Format email
  | 'phone'        // Numéro de téléphone
  | 'number'       // Nombre
  | 'integer'      // Entier
  | 'string'       // Chaîne de caractères
  | 'text'         // Texte long
  | 'regex'        // Pattern regex personnalisé
  | 'url'          // URL valide
  | 'date'         // Date valide
  | 'boolean'      // Boolean
  | 'enum'         // Valeur dans une liste
  | 'custom';      // Validateur personnalisé

/**
 * Résultat de validation
 */
export interface ValidationResult {
  isValid: boolean;
  message?: string;
  errors?: ValidationError[];
  data?: Record<string, any>; // Données validées et transformées
}

/**
 * Erreur de validation
 */
export interface ValidationError {
  field: string;
  type: ValidationType;
  message: string;
  value?: any;
}

/**
 * Validateur personnalisé
 */
export interface CustomValidator {
  name: string;
  validate(value: any, context?: Record<string, any>): Promise<CustomValidationResult>;
}

/**
 * Résultat d'un validateur personnalisé
 */
export interface CustomValidationResult {
  isValid: boolean;
  message?: string;
  transformedValue?: any;
}

/**
 * Configuration du service de validation
 */
export interface ValidationConfig {
  strictMode?: boolean; // Mode strict (toutes les erreurs)
  stopOnFirstError?: boolean; // S'arrêter à la première erreur
  trimStrings?: boolean; // Trim automatique des strings
  convertTypes?: boolean; // Conversion automatique de types
}

/**
 * Schema de validation (ensemble de règles)
 */
export interface ValidationSchema {
  name: string;
  rules: ValidationRule[];
  metadata?: Record<string, any>;
}
