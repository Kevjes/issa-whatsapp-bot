import { IIntentClassifier } from '../core/interfaces/IIntentClassifier';
import { IntentDefinition, IntentClassificationResult, IntentClassifierConfig, ClassificationContext, EntityExtractor } from '../types/intent';
export declare class IntentClassifier implements IIntentClassifier {
    private intents;
    private entityExtractors;
    private config;
    private cache;
    constructor(config?: Partial<IntentClassifierConfig>);
    classifyIntent(message: string, context?: ClassificationContext): Promise<IntentClassificationResult>;
    private classifyByKeywords;
    private classifyByPatterns;
    private extractEntities;
    private extractBasicEntities;
    registerIntent(intent: IntentDefinition): void;
    registerEntityExtractor(extractor: EntityExtractor): void;
    getRegisteredIntents(): IntentDefinition[];
    getIntent(intentName: string): IntentDefinition | undefined;
    updateConfig(config: Partial<IntentClassifierConfig>): void;
    getConfig(): IntentClassifierConfig;
    private normalizeMessage;
    private getCacheKey;
    private registerDefaultIntents;
}
//# sourceMappingURL=intentClassifier.d.ts.map