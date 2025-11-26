"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessSubscriptionHandler = exports.GeneratePurchaseSummaryHandler = void 0;
const logger_1 = require("../../utils/logger");
class GeneratePurchaseSummaryHandler {
    constructor() {
        this.name = 'generate_purchase_summary';
    }
    async execute(context) {
        try {
            const productMap = {
                '1': 'Takaful Auto',
                '2': 'Takaful Santé',
                '3': 'Takaful Habitation',
                '4': 'Takaful Vie'
            };
            const productType = context.data.product_type;
            const productName = productMap[productType] || 'Produit inconnu';
            return {
                success: true,
                data: {
                    product_name: productName
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error generating purchase summary', {
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
exports.GeneratePurchaseSummaryHandler = GeneratePurchaseSummaryHandler;
class ProcessSubscriptionHandler {
    constructor() {
        this.name = 'process_subscription';
    }
    async execute(context) {
        try {
            logger_1.logger.info('Processing subscription', {
                userId: context.userId,
                workflowId: context.workflowId,
                productType: context.data.product_type,
                fullName: context.data.full_name,
                phone: context.data.phone_number,
                email: context.data.email
            });
            const dossierNumber = `TKF-${Date.now()}-${context.userId}`;
            await this.simulateProcessing();
            logger_1.logger.info('Subscription processed successfully', {
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
        }
        catch (error) {
            logger_1.logger.error('Error processing subscription', {
                error: error instanceof Error ? error.message : 'Unknown error',
                context
            });
            return {
                success: false,
                error: 'Erreur lors du traitement de la souscription'
            };
        }
    }
    async simulateProcessing() {
        return new Promise(resolve => setTimeout(resolve, 1000));
    }
}
exports.ProcessSubscriptionHandler = ProcessSubscriptionHandler;
//# sourceMappingURL=purchaseHandlers.js.map