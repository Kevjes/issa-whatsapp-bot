"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationService = void 0;
const logger_1 = require("../utils/logger");
class ValidationService {
    constructor(config) {
        this.customValidators = new Map();
        this.config = {
            strictMode: config?.strictMode !== undefined ? config.strictMode : false,
            stopOnFirstError: config?.stopOnFirstError !== undefined ? config.stopOnFirstError : true,
            trimStrings: config?.trimStrings !== undefined ? config.trimStrings : true,
            convertTypes: config?.convertTypes !== undefined ? config.convertTypes : true
        };
        logger_1.logger.info('ValidationService initialized', { config: this.config });
    }
    async validate(value, rules, context) {
        const errors = [];
        const data = {};
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
                }
                else {
                    data[rule.field] = ruleResult.transformedValue !== undefined
                        ? ruleResult.transformedValue
                        : processedValue;
                }
            }
            catch (error) {
                logger_1.logger.error('Error validating rule', {
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
    async validateSchema(data, schema) {
        const errors = [];
        const validatedData = {};
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
            }
            else {
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
    async validateRule(value, rule, context) {
        if (rule.required && (value === undefined || value === null || value === '')) {
            return {
                isValid: false,
                message: rule.message || `${rule.field} est requis`
            };
        }
        if (!rule.required && (value === undefined || value === null || value === '')) {
            return { isValid: true };
        }
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
    validateRequired(value, rule) {
        const isValid = value !== undefined && value !== null && value !== '';
        return {
            isValid,
            message: isValid ? undefined : (rule.message || 'Ce champ est requis')
        };
    }
    validateEmail(value, rule) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = typeof value === 'string' && emailRegex.test(value);
        return {
            isValid,
            message: isValid ? undefined : (rule.message || 'Email invalide'),
            transformedValue: isValid ? value.toLowerCase() : value
        };
    }
    validatePhone(value, rule) {
        const phoneRegex = /^(?:\+237|237)?[62]\d{8}$/;
        const cleaned = typeof value === 'string' ? value.replace(/[\s-]/g, '') : '';
        const isValid = phoneRegex.test(cleaned);
        return {
            isValid,
            message: isValid ? undefined : (rule.message || 'Numéro de téléphone invalide'),
            transformedValue: isValid ? cleaned : value
        };
    }
    validateNumber(value, rule) {
        const num = Number(value);
        let isValid = !isNaN(num) && isFinite(num);
        let message;
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
    validateInteger(value, rule) {
        const num = Number(value);
        let isValid = !isNaN(num) && Number.isInteger(num);
        let message;
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
    validateString(value, rule) {
        const isString = typeof value === 'string';
        let isValid = isString;
        let message;
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
    validateText(value, rule) {
        return this.validateString(value, rule);
    }
    validateRegex(value, rule) {
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
    validateUrl(value, rule) {
        try {
            new URL(value);
            return { isValid: true };
        }
        catch {
            return {
                isValid: false,
                message: rule.message || 'URL invalide'
            };
        }
    }
    validateDate(value, rule) {
        const date = new Date(value);
        const isValid = date instanceof Date && !isNaN(date.getTime());
        return {
            isValid,
            message: isValid ? undefined : (rule.message || 'Date invalide'),
            transformedValue: isValid ? date.toISOString() : value
        };
    }
    validateBoolean(value, rule) {
        let transformedValue;
        let isValid = true;
        if (typeof value === 'boolean') {
            transformedValue = value;
        }
        else if (typeof value === 'string') {
            const lower = value.toLowerCase();
            if (lower === 'true' || lower === 'oui' || lower === 'yes' || lower === '1') {
                transformedValue = true;
            }
            else if (lower === 'false' || lower === 'non' || lower === 'no' || lower === '0') {
                transformedValue = false;
            }
            else {
                isValid = false;
            }
        }
        else {
            isValid = false;
        }
        return {
            isValid,
            message: isValid ? undefined : (rule.message || 'Valeur booléenne invalide'),
            transformedValue: isValid ? transformedValue : value
        };
    }
    validateEnum(value, rule) {
        if (!rule.options || rule.options.length === 0) {
            return { isValid: false, message: 'Options enum non définies' };
        }
        const isValid = rule.options.includes(String(value));
        return {
            isValid,
            message: isValid ? undefined : (rule.message || `Valeur doit être parmi: ${rule.options.join(', ')}`)
        };
    }
    async validateCustom(value, rule, context) {
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
        }
        catch (error) {
            logger_1.logger.error('Error in custom validator', {
                validator: rule.customValidator,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                isValid: false,
                message: 'Erreur lors de la validation personnalisée'
            };
        }
    }
    registerCustomValidator(validator) {
        this.customValidators.set(validator.name, validator);
        logger_1.logger.debug('Custom validator registered', { name: validator.name });
    }
    getCustomValidator(name) {
        return this.customValidators.get(name);
    }
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        logger_1.logger.info('ValidationService config updated', { config: this.config });
    }
    getConfig() {
        return { ...this.config };
    }
}
exports.ValidationService = ValidationService;
//# sourceMappingURL=validationService.js.map