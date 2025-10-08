import { IntentDefinition, IntentClassificationResult, IntentClassifierConfig, ClassificationContext, EntityExtractor } from '../../types/intent';
export interface IIntentClassifier {
    classifyIntent(message: string, context?: ClassificationContext): Promise<IntentClassificationResult>;
    registerIntent(intent: IntentDefinition): void;
    registerEntityExtractor(extractor: EntityExtractor): void;
    getRegisteredIntents(): IntentDefinition[];
    getIntent(intentName: string): IntentDefinition | undefined;
    updateConfig(config: Partial<IntentClassifierConfig>): void;
    getConfig(): IntentClassifierConfig;
}
//# sourceMappingURL=IIntentClassifier.d.ts.map