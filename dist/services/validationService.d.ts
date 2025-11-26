import { IValidationService } from '../core/interfaces/IValidationService';
import { ValidationRule, ValidationResult, ValidationSchema, CustomValidator, ValidationConfig } from '../types/validation';
export declare class ValidationService implements IValidationService {
    private customValidators;
    private config;
    constructor(config?: Partial<ValidationConfig>);
    validate(value: any, rules: ValidationRule[], context?: Record<string, any>): Promise<ValidationResult>;
    validateSchema(data: Record<string, any>, schema: ValidationSchema): Promise<ValidationResult>;
    private validateRule;
    private validateRequired;
    private validateEmail;
    private validatePhone;
    private validateNumber;
    private validateInteger;
    private validateString;
    private validateText;
    private validateRegex;
    private validateUrl;
    private validateDate;
    private validateBoolean;
    private validateEnum;
    private validateCustom;
    registerCustomValidator(validator: CustomValidator): void;
    getCustomValidator(name: string): CustomValidator | undefined;
    updateConfig(config: Partial<ValidationConfig>): void;
    getConfig(): ValidationConfig;
}
//# sourceMappingURL=validationService.d.ts.map