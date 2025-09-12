// Types pour les messages WhatsApp
export interface WhatsAppMessage {
  object: string;
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  value: WhatsAppValue;
  field: string;
}

export interface WhatsAppValue {
  messaging_product: string;
  metadata: WhatsAppMetadata;
  contacts?: WhatsAppContact[];
  messages?: WhatsAppIncomingMessage[];
  statuses?: WhatsAppStatus[];
}

export interface WhatsAppMetadata {
  display_phone_number: string;
  phone_number_id: string;
}

export interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface WhatsAppIncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  text?: {
    body: string;
  };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'interactive';
}

export interface WhatsAppStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
}

// Types pour les réponses WhatsApp
export interface WhatsAppOutgoingMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text' | 'interactive' | 'image';
  text?: {
    body: string;
  };
  interactive?: WhatsAppInteractive;
  image?: WhatsAppImageMedia;
}

// Types pour les médias image
export interface WhatsAppImageMedia {
  link?: string;
  id?: string;
  caption?: string;
}

// Types pour les messages interactifs
export interface WhatsAppInteractive {
  type: 'button' | 'list';
  header?: {
    type: 'text';
    text: string;
  };
  body: {
    text: string;
  };
  footer?: {
    text: string;
  };
  action: WhatsAppAction;
}

export interface WhatsAppAction {
  buttons?: WhatsAppButton[];
  button?: string;
  sections?: WhatsAppSection[];
}

export interface WhatsAppButton {
  type: 'reply';
  reply: {
    id: string;
    title: string;
  };
}

export interface WhatsAppSection {
  title: string;
  rows: WhatsAppRow[];
}

export interface WhatsAppRow {
  id: string;
  title: string;
  description?: string;
}

// Types pour les réponses bancaires
export interface BankingLoginResponse {
  success: boolean;
  message: string;
  accounts?: AccountNumber[];
  error?: string;
}

export interface SoldeDTO {
  solde: number;
  currency: string;
}

export interface AccountNumber {
  accountValue: string;
  currency: string;
}


// Types pour DeepSeek AI
export interface DeepSeekRequest {
  model: string;
  messages: DeepSeekMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: DeepSeekChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface DeepSeekChoice {
  index: number;
  message: DeepSeekMessage;
  finish_reason: string;
}

// Types pour la configuration
export interface AppConfig {
  port: number;
  nodeEnv: string;
  whatsapp: {
    accessToken: string;
    phoneNumberId: string;
    businessAccountId: string;
    webhookVerifyToken: string;
    appSecret: string;
  };
  security: {
    jwtSecret: string;
    encryptionKey: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  initWords: {
    words: string[];
  };
  database: {
    path: string;
  };
  ai: {
    provider: 'openai' | 'deepseek';
    apiKey: string;
    model: string;
    baseUrl?: string;
  };
}

// Types pour les erreurs
export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  details?: unknown;
}

// Types pour les logs
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, unknown>;
}


// Types pour les utilisateurs et conversations
export interface User {
  id?: number;
  phoneNumber: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  updatedAt: string;
  lastInteraction?: string;
  isActive: boolean;
  conversationState: 'greeting' | 'name_collection' | 'active' | 'idle';
}

export interface ConversationMessage {
  id?: number;
  userId: number;
  phoneNumber: string;
  messageId: string;
  content: string;
  messageType: 'user' | 'bot';
  timestamp: string;
  aiProvider?: 'openai' | 'deepseek';
  metadata?: Record<string, unknown>;
}

export interface ConversationContext {
  userId: number;
  phoneNumber: string;
  userName?: string;
  conversationHistory: ConversationMessage[];
  lastInteraction: string;
  state: 'greeting' | 'name_collection' | 'active' | 'idle';
}

export interface AIProviderConfig {
  provider: 'openai' | 'deepseek';
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface KnowledgeBase {
  id?: number;
  category: string;
  title: string;
  content: string;
  keywords: string[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// Types pour les réponses d'IA
export interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
  provider: 'openai' | 'deepseek';
  tokensUsed?: number;
}

// Types pour OpenAI
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIChoice {
  index: number;
  message: OpenAIMessage;
  finish_reason: string;
}

// Types pour le contexte utilisateur (pour plus tard)
export interface UserContext {
  phoneNumber: string;
  name?: string;
  lastInteraction: Date;
  conversationState: 'idle' | 'awaiting_auth' | 'authenticated' | 'in_transaction';
  sessionData?: Record<string, unknown>;
}