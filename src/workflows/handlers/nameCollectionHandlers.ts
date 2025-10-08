/**
 * Handlers pour le workflow de collecte du nom
 * Architecture: Application Layer (Clean Architecture)
 */

import { WorkflowHandler, WorkflowHandlerResult, WorkflowContext } from '../../types/workflow';
import { logger } from '../../utils/logger';

/**
 * Handler pour valider le nom de l'utilisateur
 * Vérifie que le nom n'est pas une salutation, une question, etc.
 */
export class ValidateUserNameHandler implements WorkflowHandler {
  name = 'validate_user_name';

  // Patterns à rejeter (salutations, questions, mots invalides)
  private readonly invalidPatterns = [
    /^\d+$/, // Que des chiffres
    /^[!@#$%^&*()]+$/, // Que des symboles
    /^(bonjour|salut|hello|hi|hey|salam|assalam|bonsoir|bonne\s*journée)$/i,
    /^(ok|oui|non|merci|d'?accord)$/i,
    /\?/, // Contient un point d'interrogation
    /^(c'est|cest|qu'est|quest|quoi|comment|pourquoi|qui|quand|où|ou|est-ce|quel|quelle)/i,
    /(quoi|comment|pourquoi|qui|quand|où|quel|quelle)\s+/i
  ];

  async execute(context: WorkflowContext): Promise<WorkflowHandlerResult> {
    try {
      const userName = context.data.user_name?.trim();

      if (!userName) {
        return {
          success: false,
          error: 'Nom manquant'
        };
      }

      // Vérifier les patterns invalides
      for (const pattern of this.invalidPatterns) {
        if (pattern.test(userName)) {
          logger.warn('Invalid name pattern detected', {
            userName,
            pattern: pattern.toString()
          });

          return {
            success: false,
            error: `Je n'ai pas bien compris votre nom.

Pouvez-vous me dire comment vous vous appelez ?

Par exemple : "Ahmed", "Marie", "Jean-Paul", etc.`,
            nextState: 'await_name_input' // Retour à la saisie du nom
          };
        }
      }

      // Nettoyer le nom (capitaliser la première lettre)
      const cleanedName = this.cleanName(userName);

      logger.info('User name validated successfully', {
        originalName: userName,
        cleanedName,
        userId: context.userId
      });

      return {
        success: true,
        data: {
          user_name: cleanedName // Remplacer par le nom nettoyé
        }
      };

    } catch (error) {
      logger.error('Error validating user name', {
        error: error instanceof Error ? error.message : 'Unknown error',
        context
      });

      return {
        success: false,
        error: 'Erreur lors de la validation du nom'
      };
    }
  }

  /**
   * Nettoyer et formater le nom
   */
  private cleanName(name: string): string {
    // Capitaliser la première lettre de chaque mot
    return name
      .split(' ')
      .map(word => {
        if (word.length === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }
}

/**
 * Handler pour sauvegarder le nom dans la base de données
 */
export class SaveUserNameHandler implements WorkflowHandler {
  name = 'save_user_name';

  async execute(context: WorkflowContext): Promise<WorkflowHandlerResult> {
    try {
      const userName = context.data.user_name;

      if (!userName) {
        return {
          success: false,
          error: 'Nom manquant pour la sauvegarde'
        };
      }

      // La sauvegarde effective sera faite par le ConversationService
      // qui a accès au DatabaseService
      // On marque juste que le nom est prêt à être sauvegardé

      logger.info('User name ready to be saved', {
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

    } catch (error) {
      logger.error('Error preparing user name for save', {
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
