/**
 * Handlers pour le workflow de souscription
 * Architecture: Application Layer (Clean Architecture)
 */

import { WorkflowHandler, WorkflowHandlerResult, WorkflowContext } from '../../types/workflow';
import { logger } from '../../utils/logger';

/**
 * Handler pour générer le récapitulatif de la souscription
 */
export class GeneratePurchaseSummaryHandler implements WorkflowHandler {
  name = 'generate_purchase_summary';

  async execute(context: WorkflowContext): Promise<WorkflowHandlerResult> {
    try {
      // Mapper les numéros de produit vers les noms
      const productMap: Record<string, string> = {
        '1': 'Takaful Auto',
        '2': 'Takaful Santé',
        '3': 'Takaful Habitation',
        '4': 'Takaful Vie'
      };

      const productType = context.data.product_type;
      const productName = productMap[productType] || 'Produit inconnu';

      // Ajouter le nom du produit au contexte
      return {
        success: true,
        data: {
          product_name: productName
        }
      };

    } catch (error) {
      logger.error('Error generating purchase summary', {
        error: error instanceof Error ? error.message : 'Unknown error',
        context
      });

      return {
        success: false,
        error: 'Erreur lors de la génération du récapitulatif'
      };
    }
  }
}

/**
 * Handler pour traiter la souscription
 */
export class ProcessSubscriptionHandler implements WorkflowHandler {
  name = 'process_subscription';

  async execute(context: WorkflowContext): Promise<WorkflowHandlerResult> {
    try {
      // Ici, vous pouvez :
      // 1. Enregistrer la souscription dans une base de données
      // 2. Envoyer un email de confirmation
      // 3. Créer un ticket dans un CRM
      // 4. Notifier l'équipe commerciale
      // 5. Générer un numéro de dossier

      logger.info('Processing subscription', {
        userId: context.userId,
        workflowId: context.workflowId,
        productType: context.data.product_type,
        fullName: context.data.full_name,
        phone: context.data.phone_number,
        email: context.data.email
      });

      // Générer un numéro de dossier
      const dossierNumber = `TKF-${Date.now()}-${context.userId}`;

      // Simuler le traitement (dans un vrai système, appeler des APIs)
      await this.simulateProcessing();

      logger.info('Subscription processed successfully', {
        dossierNumber,
        userId: context.userId
      });

      return {
        success: true,
        data: {
          dossier_number: dossierNumber,
          processed_at: new Date().toISOString()
        },
        output: `Votre numéro de dossier est: ${dossierNumber}`
      };

    } catch (error) {
      logger.error('Error processing subscription', {
        error: error instanceof Error ? error.message : 'Unknown error',
        context
      });

      return {
        success: false,
        error: 'Erreur lors du traitement de la souscription'
      };
    }
  }

  private async simulateProcessing(): Promise<void> {
    // Simuler un délai de traitement
    return new Promise(resolve => setTimeout(resolve, 1000));
  }
}
