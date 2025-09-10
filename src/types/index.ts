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

// Types pour les sessions PIN
export interface PinSession {
  id: string;
  phoneNumber: string;
  action: string;
  accountNumber?: string;
  accounts?: AccountNumber[];
  createdAt: string;
  expiresAt: string;
  lastAuthenticatedAt?: string;
  isCompleted: boolean;
  isExpired: boolean;
  isLinkUsed: boolean;
  metadata?: any;
}

export interface TokenRecord {
  id?: number;
  token: string;
  expiresAt: string;
  createdAt?: string;
}

// Types pour l'authentification bancaire
export interface BankingAuthRequest {
  username: string;
  password: string;
  email: string;
  device: string;
}

export interface BankingAuthResponse {
  success: boolean;
  token?: string;
  expiresAt?: string;
  message?: string;
  error?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  expiresAt?: string;
  message?: string;
}

export interface TokenData {
  token: string;
  expiresAt: string;
}

// Types pour les services bancaires
export interface LoginResponse {
  success: boolean;
  message: string;
  accounts?: BankAccount[];
  error?: string;
}

export interface BankAccount {
  accountValue: string;
  currency: string;
}

export interface AccountBalance {
  solde: number;
  currency: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  balance: number;
}

// Types pour les messages entrants interactifs
export interface WhatsAppInteractiveMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'interactive';
  interactive: {
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
  banking: {
    apiUrl: string;
    username: string;
    password: string;
    email: string;
    device: string;
  };
  pin: {
    sessionTimeoutMinutes: number;
    cleanupIntervalMinutes: number;
    baseUrl: string;
  };
  welcome: {
    images: string[];
  };
  initWords: {
    words: string[];
  };
  database: {
    path: string;
  };
  dashboard: {
    admin: {
      username: string;
      password: string;
    };
    jwt: {
      secret: string;
      expiresIn: string;
      refreshExpiresIn: string;
    };
    cleanup: {
      enabled: boolean;
      intervalHours: number;
      logsRetentionDays: number;
      sessionsRetentionDays: number;
    };
  };
}

// Types pour les erreurs
export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  details?: any;
}

// Types pour les logs
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: any;
}

// Types pour les transferts intra-bancaires
export interface TransferRequest {
  senderAccount: string;
  receiverAccount: string;
  amount: number;
  reason: string;
  currency: string;
}

export interface TransferResponse {
  success: boolean;
  returnMsg: string;
  trxId: string;
  returnValue?: {
    eventNo: string;
    eventDate: string;
    amount: number;
    fees: number;
    status: string;
    branchCode: string;
    accountNo: string;
    reason: string;
    opeCode: string;
    opeTitle: string;
    custId: string;
    custName: string;
    recipientName: string;
    recipientAccount: string;
  }
  fees?: number;
  error?: string;
}

export interface TransferSession {
  id: string;
  phoneNumber: string;
  senderAccount?: string;
  receiverAccount?: string;
  receiverAccountHolder?: string;
  amount?: number;
  reason?: string;
  currency?: string;
  step: 'account_selection' | 'receiver_input' | 'receiver_confirmation' | 'amount_input' | 'reason_input' | 'preview' | 'otp_verification' | 'completed';
  createdAt: string;
  expiresAt: string;
  otpInitiated?: boolean;
  otpAttempts?: number;
}

export interface AccountValidationResponse {
  success: boolean;
  accountExists: boolean;
  accountHolder?: string;
  message?: string;
  error?: string;
}

// Types pour le contexte utilisateur (pour plus tard)
export interface UserContext {
  phoneNumber: string;
  name?: string;
  lastInteraction: Date;
  conversationState: 'idle' | 'awaiting_auth' | 'authenticated' | 'in_transaction';
  sessionData?: any;
}