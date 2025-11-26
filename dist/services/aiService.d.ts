import { AIResponse, AIProviderConfig, ConversationMessage } from '../types';
import { IHttpClient } from '../core/interfaces/IHttpClient';
export declare class AIService {
    private httpClient;
    private aiConfig;
    constructor(httpClient: IHttpClient);
    private getDefaultModel;
    generateResponse(userMessage: string, conversationHistory?: ConversationMessage[], systemPrompt?: string): Promise<AIResponse>;
    private buildMessages;
    private callOpenAI;
    private callDeepSeek;
    private callGemini;
    createSystemPrompt(userName?: string, knowledgeContext?: string): string;
    createGreetingMessage(userName?: string): string;
    createNameRequestMessage(): string;
    createWelcomeAfterNameMessage(userName: string): string;
    createFollowUpMessage(userName: string): string;
    createWebsiteRedirection(topic?: string): string;
    private validateResponse;
    getConfig(): AIProviderConfig;
    updateConfig(newConfig: Partial<AIProviderConfig>): void;
}
//# sourceMappingURL=aiService.d.ts.map