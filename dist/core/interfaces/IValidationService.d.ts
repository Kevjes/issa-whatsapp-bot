import { ValidationRule, ValidationResult, ValidationSchema, CustomValidator, ValidationConfig } from '../../types/validation';
export interface IValidationService {
    validate(value: any, rules: ValidationRule[], context?: Record<string, any>): Promise<ValidationResult>;
    validateSchema(data: Record<string, any>, schema: ValidationSchema): Promise<ValidationResult>;
    registerCustomValidator(validator: CustomValidator): void;
    getCustomValidator(name: string): CustomValidator | undefined;
    updateConfig(config: Partial<ValidationConfig>): void;
    getConfig(): ValidationConfig;
}
//# sourceMappingURL=IValidationService.d.ts.map