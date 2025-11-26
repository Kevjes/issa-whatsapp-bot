export interface ValidationRule {
    field: string;
    type: ValidationType;
    required?: boolean;
    pattern?: string;
    min?: number;
    max?: number;
    message?: string;
    customValidator?: string;
    options?: string[];
    metadata?: Record<string, any>;
}
export type ValidationType = 'required' | 'email' | 'phone' | 'number' | 'integer' | 'string' | 'text' | 'regex' | 'url' | 'date' | 'boolean' | 'enum' | 'custom';
export interface ValidationResult {
    isValid: boolean;
    message?: string;
    errors?: ValidationError[];
    data?: Record<string, any>;
}
export interface ValidationError {
    field: string;
    type: ValidationType;
    message: string;
    value?: any;
}
export interface CustomValidator {
    name: string;
    validate(value: any, context?: Record<string, any>): Promise<CustomValidationResult>;
}
export interface CustomValidationResult {
    isValid: boolean;
    message?: string;
    transformedValue?: any;
}
export interface ValidationConfig {
    strictMode?: boolean;
    stopOnFirstError?: boolean;
    trimStrings?: boolean;
    convertTypes?: boolean;
}
export interface ValidationSchema {
    name: string;
    rules: ValidationRule[];
    metadata?: Record<string, any>;
}
//# sourceMappingURL=validation.d.ts.map