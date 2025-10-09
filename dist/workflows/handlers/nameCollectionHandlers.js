"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaveUserNameHandler = exports.ValidateUserNameHandler = void 0;
const logger_1 = require("../../utils/logger");
class ValidateUserNameHandler {
    constructor() {
        this.name = 'validate_user_name';
        this.invalidPatterns = [
            /^\d+$/,
            /^[!@#$%^&*()]+$/,
            /^(bonjour|salut|hello|hi|hey|salam|assalam|bonsoir|bonne\s*journée)$/i,
            /^(ok|oui|non|merci|d'?accord)$/i,
            /\?/,
            /^(c'est|cest|qu'est|quest|quoi|comment|pourquoi|qui|quand|où|ou|est-ce|quel|quelle)/i,
            /(quoi|comment|pourquoi|qui|quand|où|quel|quelle)\s+/i
        ];
    }
    async execute(context, userInput) {
        try {
            const userName = (userInput || context.data.user_name)?.trim();
            logger_1.logger.info("userName", userName);
            if (!userName) {
                return {
                    success: false,
                    error: 'Nom manquant'
                };
            }
            for (const pattern of this.invalidPatterns) {
                if (pattern.test(userName)) {
                    logger_1.logger.warn('Invalid name pattern detected', {
                        userName,
                        pattern: pattern.toString()
                    });
                    return {
                        success: false,
                        error: `Je n'ai pas bien compris votre nom.

Pouvez-vous me dire comment vous vous appelez ?

Par exemple : "Ahmed", "Marie", "Jean-Paul", etc.`,
                        nextState: 'await_name_input'
                    };
                }
            }
            const cleanedName = this.cleanName(userName);
            logger_1.logger.info('User name validated successfully', {
                originalName: userName,
                cleanedName,
                userId: context.userId
            });
            return {
                success: true,
                data: {
                    user_name: cleanedName
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error validating user name', {
                error: error instanceof Error ? error.message : 'Unknown error',
                context
            });
            return {
                success: false,
                error: 'Erreur lors de la validation du nom'
            };
        }
    }
    cleanName(name) {
        return name
            .split(' ')
            .map(word => {
            if (word.length === 0)
                return word;
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
            .join(' ');
    }
}
exports.ValidateUserNameHandler = ValidateUserNameHandler;
class SaveUserNameHandler {
    constructor() {
        this.name = 'save_user_name';
    }
    async execute(context) {
        try {
            const userName = context.data.user_name;
            if (!userName) {
                return {
                    success: false,
                    error: 'Nom manquant pour la sauvegarde'
                };
            }
            logger_1.logger.info('User name ready to be saved', {
                userName,
                userId: context.userId,
                workflowId: context.workflowId
            });
            return {
                success: true,
                data: {
                    name_validated: true,
                    save_to_database: true,
                    userName,
                    completedAt: new Date().toISOString()
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error preparing user name for save', {
                error: error instanceof Error ? error.message : 'Unknown error',
                context
            });
            return {
                success: false,
                error: 'Erreur lors de la préparation de la sauvegarde du nom'
            };
        }
    }
}
exports.SaveUserNameHandler = SaveUserNameHandler;
//# sourceMappingURL=nameCollectionHandlers.js.map