"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
function mapKnowledgeBaseToEntry(kb) {
    return {
        id: kb.id,
        category: kb.category,
        title: kb.title,
        content: kb.content,
        keywords: kb.keywords,
        createdAt: kb.createdAt,
        updatedAt: kb.updatedAt,
        isActive: kb.isActive
    };
}
class DatabaseService {
    constructor() {
        this.db = null;
        this.initialized = false;
    }
    async initialize() {
        if (this.initialized) {
            return;
        }
        try {
            const dbDir = path.dirname(config_1.config.database.path);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }
            this.db = new sqlite3_1.default.Database(config_1.config.database.path, (err) => {
                if (err) {
                    logger_1.logger.error('Erreur lors de l\'ouverture de la base de données SQLite', { error: err });
                    throw err;
                }
            });
            await this.runQuery('PRAGMA foreign_keys = ON');
            await this.createTables();
            this.initialized = true;
            logger_1.logger.info('Base de données SQLite initialisée avec succès', { path: config_1.config.database.path });
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de l\'initialisation de la base de données SQLite', { error });
            throw error;
        }
    }
    runQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de données non initialisée'));
                return;
            }
            this.db.run(sql, params, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }
    getQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de données non initialisée'));
                return;
            }
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(row);
                }
            });
        });
    }
    allQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de données non initialisée'));
                return;
            }
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve((rows || []));
                }
            });
        });
    }
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }
    async createTables() {
        if (!this.db) {
            throw new Error('Base de données non initialisée');
        }
        try {
            await this.runQuery(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone_number TEXT UNIQUE NOT NULL,
          name TEXT,
          first_name TEXT,
          last_name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_interaction DATETIME,
          is_active INTEGER DEFAULT 1,
          conversation_state TEXT DEFAULT 'greeting',
          pending_message TEXT
        )
      `);
            await this.runQuery(`
        CREATE TABLE IF NOT EXISTS conversation_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          phone_number TEXT NOT NULL,
          message_id TEXT NOT NULL,
          content TEXT NOT NULL,
          message_type TEXT NOT NULL CHECK (message_type IN ('user', 'bot')),
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          ai_provider TEXT,
          metadata TEXT,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);
            await this.runQuery(`
        CREATE TABLE IF NOT EXISTS knowledge_base (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          keywords TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active INTEGER DEFAULT 1
        )
      `);
            await this.runQuery('CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number)');
            await this.runQuery('CREATE INDEX IF NOT EXISTS idx_users_last_interaction ON users(last_interaction)');
            await this.runQuery('CREATE INDEX IF NOT EXISTS idx_conversation_messages_user_id ON conversation_messages(user_id)');
            await this.runQuery('CREATE INDEX IF NOT EXISTS idx_conversation_messages_timestamp ON conversation_messages(timestamp)');
            await this.runQuery('CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category)');
            await this.runQuery('CREATE INDEX IF NOT EXISTS idx_knowledge_base_keywords ON knowledge_base(keywords)');
            await this.runQuery(`
        CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(
          category,
          title,
          content,
          keywords,
          content='knowledge_base',
          content_rowid='id',
          tokenize='porter unicode61 remove_diacritics 2'
        )
      `);
            await this.runQuery(`
        CREATE TRIGGER IF NOT EXISTS knowledge_fts_insert
        AFTER INSERT ON knowledge_base BEGIN
          INSERT INTO knowledge_fts(rowid, category, title, content, keywords)
          VALUES (new.id, new.category, new.title, new.content, new.keywords);
        END
      `);
            await this.runQuery(`
        CREATE TRIGGER IF NOT EXISTS knowledge_fts_update
        AFTER UPDATE ON knowledge_base BEGIN
          UPDATE knowledge_fts
          SET category = new.category,
              title = new.title,
              content = new.content,
              keywords = new.keywords
          WHERE rowid = new.id;
        END
      `);
            await this.runQuery(`
        CREATE TRIGGER IF NOT EXISTS knowledge_fts_delete
        AFTER DELETE ON knowledge_base BEGIN
          DELETE FROM knowledge_fts WHERE rowid = old.id;
        END
      `);
            await this.runQuery(`
        CREATE TABLE IF NOT EXISTS workflow_contexts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          workflow_id TEXT NOT NULL,
          current_state TEXT NOT NULL,
          data TEXT NOT NULL,
          history TEXT NOT NULL,
          metadata TEXT,
          status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'failed')),
          started_at DATETIME NOT NULL,
          updated_at DATETIME NOT NULL,
          completed_at DATETIME,
          error_message TEXT,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);
            await this.runQuery('CREATE INDEX IF NOT EXISTS idx_workflow_contexts_user_id ON workflow_contexts(user_id)');
            await this.runQuery('CREATE INDEX IF NOT EXISTS idx_workflow_contexts_status ON workflow_contexts(status)');
            await this.runQuery('CREATE INDEX IF NOT EXISTS idx_workflow_contexts_workflow_id ON workflow_contexts(workflow_id)');
            await this.runQuery(`
        CREATE TABLE IF NOT EXISTS knowledge_embeddings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          knowledge_id INTEGER NOT NULL UNIQUE,
          embedding BLOB NOT NULL,
          model_name TEXT NOT NULL,
          vector_dimension INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (knowledge_id) REFERENCES knowledge_base (id) ON DELETE CASCADE
        )
      `);
            await this.runQuery('CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_knowledge_id ON knowledge_embeddings(knowledge_id)');
            await this.runQuery('CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_model ON knowledge_embeddings(model_name)');
            logger_1.logger.info('Tables SQLite créées avec succès');
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de la création des tables SQLite', { error });
            throw error;
        }
    }
    async getOrCreateUser(phoneNumber, name) {
        await this.ensureInitialized();
        try {
            const existingUser = await this.getQuery('SELECT * FROM users WHERE phone_number = ?', [phoneNumber]);
            if (existingUser) {
                const userRow = existingUser;
                await this.runQuery('UPDATE users SET last_interaction = datetime(\'now\') WHERE id = ?', [userRow.id]);
                return {
                    id: userRow.id,
                    phoneNumber: userRow.phone_number,
                    name: userRow.name,
                    firstName: userRow.first_name,
                    lastName: userRow.last_name,
                    createdAt: userRow.created_at,
                    updatedAt: userRow.updated_at,
                    lastInteraction: userRow.last_interaction,
                    isActive: Boolean(userRow.is_active),
                    conversationState: userRow.conversation_state,
                    pendingMessage: userRow.pending_message || undefined
                };
            }
            const result = await this.runQuery(`INSERT INTO users (phone_number, name, last_interaction, conversation_state)
         VALUES (?, ?, datetime('now'), 'greeting')`, [phoneNumber, name || null]);
            const newUser = {
                id: result.lastID,
                phoneNumber,
                name: name || undefined,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                lastInteraction: new Date().toISOString(),
                isActive: true,
                conversationState: 'greeting'
            };
            logger_1.logger.debug('Nouvel utilisateur créé', { userId: result.lastID, phoneNumber });
            return newUser;
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de la création/récupération de l\'utilisateur', { error, phoneNumber });
            throw error;
        }
    }
    async updateUserState(userId, state, name, pendingMessage) {
        await this.ensureInitialized();
        try {
            const updateFields = ['conversation_state = ?', 'updated_at = datetime(\'now\')'];
            const params = [state];
            if (name !== undefined) {
                updateFields.push('name = ?');
                params.push(name);
            }
            if (pendingMessage !== undefined) {
                updateFields.push('pending_message = ?');
                params.push(pendingMessage);
            }
            params.push(userId);
            await this.runQuery(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`, params);
            logger_1.logger.debug('État utilisateur mis à jour', { userId, state, name, hasPendingMessage: !!pendingMessage });
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de la mise à jour de l\'état utilisateur', { error, userId, state });
            throw error;
        }
    }
    async saveConversationMessage(message) {
        await this.ensureInitialized();
        try {
            const result = await this.runQuery(`INSERT INTO conversation_messages 
         (user_id, phone_number, message_id, content, message_type, timestamp, ai_provider, metadata) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                message.userId,
                message.phoneNumber,
                message.messageId,
                message.content,
                message.messageType,
                message.timestamp,
                message.aiProvider || null,
                message.metadata ? JSON.stringify(message.metadata) : null
            ]);
            logger_1.logger.debug('Message de conversation sauvegardé', {
                messageId: result.lastID,
                userId: message.userId,
                messageType: message.messageType
            });
            return result.lastID;
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de la sauvegarde du message', { error, message });
            throw error;
        }
    }
    async getConversationHistory(userId, limit = 50) {
        await this.ensureInitialized();
        try {
            const rows = await this.allQuery(`SELECT * FROM conversation_messages 
         WHERE user_id = ? 
         ORDER BY timestamp DESC 
         LIMIT ?`, [userId, limit]);
            return rows.map(row => {
                const messageRow = row;
                return {
                    id: messageRow.id,
                    userId: messageRow.user_id,
                    phoneNumber: messageRow.phone_number,
                    messageId: messageRow.message_id,
                    content: messageRow.content,
                    messageType: messageRow.message_type,
                    timestamp: messageRow.timestamp,
                    aiProvider: messageRow.ai_provider,
                    metadata: messageRow.metadata ? JSON.parse(messageRow.metadata) : undefined
                };
            }).reverse();
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de la récupération de l\'historique', { error, userId });
            throw error;
        }
    }
    async searchKnowledgeBase(query) {
        await this.ensureInitialized();
        try {
            const cleanQuery = query.replace(/[^\w\sÀ-ÿ]/g, ' ').trim();
            if (!cleanQuery) {
                logger_1.logger.warn('Requête vide après nettoyage', { originalQuery: query });
                return [];
            }
            const orQuery = cleanQuery.split(/\s+/).filter(w => w.length > 0).join(' OR ');
            const rows = await this.allQuery(`SELECT kb.*,
                bm25(knowledge_fts) as relevance_score
         FROM knowledge_fts
         JOIN knowledge_base kb ON kb.id = knowledge_fts.rowid
         WHERE knowledge_fts MATCH ?
         AND kb.is_active = 1
         ORDER BY bm25(knowledge_fts)
         LIMIT 10`, [orQuery]);
            if (rows.length === 0) {
                logger_1.logger.info('Pas de résultats FTS5, utilisation fallback', { query, cleanQuery, orQuery });
                return await this.searchKnowledgeBaseFallback(query);
            }
            return rows.map(row => {
                const knowledgeRow = row;
                return mapKnowledgeBaseToEntry({
                    id: knowledgeRow.id,
                    category: knowledgeRow.category,
                    title: knowledgeRow.title,
                    content: knowledgeRow.content,
                    keywords: JSON.parse(knowledgeRow.keywords),
                    createdAt: knowledgeRow.created_at,
                    updatedAt: knowledgeRow.updated_at,
                    isActive: Boolean(knowledgeRow.is_active)
                });
            });
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de la recherche dans la base de connaissances', { error, query });
            return await this.searchKnowledgeBaseFallback(query);
        }
    }
    async searchKnowledgeBaseFallback(query) {
        try {
            let rows = await this.allQuery(`SELECT * FROM knowledge_base
         WHERE is_active = 1
         AND (
           keywords LIKE ?
           OR content LIKE ?
           OR title LIKE ?
           OR category LIKE ?
         )
         ORDER BY
           CASE
             WHEN title LIKE ? THEN 1
             WHEN keywords LIKE ? THEN 2
             WHEN category LIKE ? THEN 3
             ELSE 4
           END
         LIMIT 10`, [
                `%${query}%`,
                `%${query}%`,
                `%${query}%`,
                `%${query}%`,
                `%${query}%`,
                `%${query}%`,
                `%${query}%`
            ]);
            if (rows.length === 0) {
                const words = query.split(/\s+/).filter(w => w.length > 2);
                logger_1.logger.info('Recherche avec mots individuels', { words });
                if (words.length > 0) {
                    const conditions = words.map(() => '(keywords LIKE ? OR content LIKE ? OR title LIKE ? OR category LIKE ?)').join(' OR ');
                    const params = words.flatMap(word => [
                        `%${word}%`,
                        `%${word}%`,
                        `%${word}%`,
                        `%${word}%`
                    ]);
                    rows = await this.allQuery(`SELECT * FROM knowledge_base
             WHERE is_active = 1
             AND (${conditions})
             LIMIT 10`, params);
                }
            }
            return rows.map(row => {
                const knowledgeRow = row;
                return mapKnowledgeBaseToEntry({
                    id: knowledgeRow.id,
                    category: knowledgeRow.category,
                    title: knowledgeRow.title,
                    content: knowledgeRow.content,
                    keywords: JSON.parse(knowledgeRow.keywords),
                    createdAt: knowledgeRow.created_at,
                    updatedAt: knowledgeRow.updated_at,
                    isActive: Boolean(knowledgeRow.is_active)
                });
            });
        }
        catch (error) {
            logger_1.logger.error('Erreur dans la recherche fallback', { error, query });
            return [];
        }
    }
    async addKnowledgeEntry(entry) {
        await this.ensureInitialized();
        try {
            const result = await this.runQuery(`INSERT INTO knowledge_base (category, title, content, keywords, is_active) 
         VALUES (?, ?, ?, ?, ?)`, [
                entry.category,
                entry.title,
                entry.content,
                JSON.stringify(entry.keywords),
                entry.isActive ? 1 : 0
            ]);
            logger_1.logger.debug('Entrée ajoutée à la base de connaissances', {
                entryId: result.lastID,
                category: entry.category,
                title: entry.title
            });
            return result.lastID;
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de l\'ajout à la base de connaissances', { error, entry });
            throw error;
        }
    }
    async getActiveUsers() {
        await this.ensureInitialized();
        try {
            const rows = await this.allQuery('SELECT * FROM users WHERE is_active = 1 ORDER BY last_interaction DESC');
            return rows.map(row => {
                const userRow = row;
                return {
                    id: userRow.id,
                    phoneNumber: userRow.phone_number,
                    name: userRow.name,
                    firstName: userRow.first_name,
                    lastName: userRow.last_name,
                    createdAt: userRow.created_at,
                    updatedAt: userRow.updated_at,
                    lastInteraction: userRow.last_interaction,
                    isActive: Boolean(userRow.is_active),
                    conversationState: userRow.conversation_state
                };
            });
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de la récupération des utilisateurs actifs', { error });
            throw error;
        }
    }
    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        logger_1.logger.error('Erreur lors de la fermeture de la base de données SQLite', { error: err });
                        reject(err);
                    }
                    else {
                        this.db = null;
                        this.initialized = false;
                        logger_1.logger.info('Connexion à la base de données SQLite fermée');
                        resolve();
                    }
                });
            }
            else {
                resolve();
            }
        });
    }
    async saveWorkflowContext(userId, context) {
        await this.ensureInitialized();
        try {
            const data = JSON.stringify(context.data);
            const history = JSON.stringify(context.history);
            const metadata = JSON.stringify(context.metadata);
            const existing = await this.getQuery('SELECT id FROM workflow_contexts WHERE user_id = ? AND status = ?', [userId, 'active']);
            if (existing) {
                await this.runQuery(`UPDATE workflow_contexts
           SET workflow_id = ?, current_state = ?, data = ?, history = ?,
               metadata = ?, status = ?, updated_at = ?, completed_at = ?, error_message = ?
           WHERE id = ?`, [
                    context.workflowId,
                    context.currentState,
                    data,
                    history,
                    metadata,
                    context.status,
                    context.updatedAt,
                    context.completedAt || null,
                    context.errorMessage || null,
                    existing.id
                ]);
                if (context.id === undefined) {
                    context.id = existing.id;
                }
            }
            else {
                const result = await this.runQuery(`INSERT INTO workflow_contexts
           (user_id, workflow_id, current_state, data, history, metadata, status, started_at, updated_at, completed_at, error_message)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                    userId,
                    context.workflowId,
                    context.currentState,
                    data,
                    history,
                    metadata,
                    context.status,
                    context.startedAt,
                    context.updatedAt,
                    context.completedAt || null,
                    context.errorMessage || null
                ]);
                context.id = result.lastID;
            }
            logger_1.logger.debug('Workflow context saved', {
                userId,
                workflowId: context.workflowId,
                contextId: context.id,
                status: context.status
            });
        }
        catch (error) {
            logger_1.logger.error('Error saving workflow context', {
                userId,
                workflowId: context.workflowId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async loadWorkflowContext(userId) {
        await this.ensureInitialized();
        try {
            const row = await this.getQuery('SELECT * FROM workflow_contexts WHERE user_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 1', [userId, 'active']);
            if (!row) {
                return null;
            }
            const context = {
                id: row.id,
                userId: row.user_id,
                workflowId: row.workflow_id,
                currentState: row.current_state,
                data: JSON.parse(row.data),
                history: JSON.parse(row.history),
                metadata: JSON.parse(row.metadata || '{}'),
                status: row.status,
                startedAt: row.started_at,
                updatedAt: row.updated_at,
                completedAt: row.completed_at,
                errorMessage: row.error_message
            };
            return context;
        }
        catch (error) {
            logger_1.logger.error('Error loading workflow context', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return null;
        }
    }
    async getWorkflowContextById(userId, workflowId) {
        await this.ensureInitialized();
        try {
            const row = await this.getQuery('SELECT * FROM workflow_contexts WHERE user_id = ? AND workflow_id = ? ORDER BY updated_at DESC LIMIT 1', [userId, workflowId]);
            if (!row) {
                return null;
            }
            const context = {
                id: row.id,
                userId: row.user_id,
                workflowId: row.workflow_id,
                currentState: row.current_state,
                data: JSON.parse(row.data),
                history: JSON.parse(row.history),
                metadata: JSON.parse(row.metadata || '{}'),
                status: row.status,
                startedAt: row.started_at,
                updatedAt: row.updated_at,
                completedAt: row.completed_at,
                errorMessage: row.error_message
            };
            return context;
        }
        catch (error) {
            logger_1.logger.error('Error loading workflow context by ID', {
                userId,
                workflowId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return null;
        }
    }
    async getAllKnowledgeEntries() {
        await this.ensureInitialized();
        try {
            const rows = await this.allQuery('SELECT * FROM knowledge_base WHERE is_active = 1');
            return rows.map(row => mapKnowledgeBaseToEntry({
                id: row.id,
                category: row.category,
                title: row.title,
                content: row.content,
                keywords: JSON.parse(row.keywords),
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                isActive: row.is_active === 1
            }));
        }
        catch (error) {
            logger_1.logger.error('Error getting all knowledge entries', { error });
            return [];
        }
    }
    async getKnowledgeByCategory(category) {
        await this.ensureInitialized();
        try {
            const rows = await this.allQuery('SELECT * FROM knowledge_base WHERE category = ? AND is_active = 1', [category]);
            return rows.map(row => mapKnowledgeBaseToEntry({
                id: row.id,
                category: row.category,
                title: row.title,
                content: row.content,
                keywords: JSON.parse(row.keywords),
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                isActive: row.is_active === 1
            }));
        }
        catch (error) {
            logger_1.logger.error('Error getting knowledge by category', { category, error });
            return [];
        }
    }
    async saveEmbedding(knowledgeId, embedding, modelName) {
        await this.ensureInitialized();
        try {
            const buffer = Buffer.from(new Float32Array(embedding).buffer);
            const existing = await this.getQuery('SELECT id FROM knowledge_embeddings WHERE knowledge_id = ?', [knowledgeId]);
            if (existing) {
                await this.runQuery(`UPDATE knowledge_embeddings
           SET embedding = ?, model_name = ?, vector_dimension = ?, updated_at = datetime('now')
           WHERE knowledge_id = ?`, [buffer, modelName, embedding.length, knowledgeId]);
            }
            else {
                await this.runQuery(`INSERT INTO knowledge_embeddings (knowledge_id, embedding, model_name, vector_dimension)
           VALUES (?, ?, ?, ?)`, [knowledgeId, buffer, modelName, embedding.length]);
            }
            logger_1.logger.debug('Embedding sauvegardé', {
                knowledgeId,
                dimension: embedding.length,
                model: modelName
            });
        }
        catch (error) {
            logger_1.logger.error('Error saving embedding', {
                knowledgeId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async getEmbedding(knowledgeId) {
        await this.ensureInitialized();
        try {
            const row = await this.getQuery('SELECT embedding, vector_dimension FROM knowledge_embeddings WHERE knowledge_id = ?', [knowledgeId]);
            if (!row) {
                return null;
            }
            const buffer = row.embedding;
            const float32Array = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
            return Array.from(float32Array);
        }
        catch (error) {
            logger_1.logger.error('Error getting embedding', { knowledgeId, error });
            return null;
        }
    }
    async getAllEmbeddings() {
        await this.ensureInitialized();
        try {
            const rows = await this.allQuery('SELECT knowledge_id, embedding FROM knowledge_embeddings');
            return rows.map(row => {
                const buffer = row.embedding;
                const float32Array = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
                return {
                    knowledgeId: row.knowledge_id,
                    embedding: Array.from(float32Array)
                };
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting all embeddings', { error });
            return [];
        }
    }
    async deleteEmbedding(knowledgeId) {
        await this.ensureInitialized();
        try {
            await this.runQuery('DELETE FROM knowledge_embeddings WHERE knowledge_id = ?', [knowledgeId]);
            logger_1.logger.debug('Embedding supprimé', { knowledgeId });
        }
        catch (error) {
            logger_1.logger.error('Error deleting embedding', { knowledgeId, error });
            throw error;
        }
    }
    async hasEmbedding(knowledgeId) {
        await this.ensureInitialized();
        try {
            const row = await this.getQuery('SELECT 1 FROM knowledge_embeddings WHERE knowledge_id = ?', [knowledgeId]);
            return !!row;
        }
        catch (error) {
            logger_1.logger.error('Error checking embedding existence', { knowledgeId, error });
            return false;
        }
    }
    async getEmbeddingsStats() {
        await this.ensureInitialized();
        try {
            const countRow = await this.getQuery('SELECT COUNT(*) as count FROM knowledge_embeddings');
            const metaRow = await this.getQuery('SELECT model_name, vector_dimension FROM knowledge_embeddings LIMIT 1');
            return {
                total: countRow?.count || 0,
                modelName: metaRow?.model_name || null,
                vectorDimension: metaRow?.vector_dimension || null
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting embeddings stats', { error });
            return { total: 0, modelName: null, vectorDimension: null };
        }
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=databaseService.js.map