import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';
import { config } from '../config';
import { logger } from '../utils/logger';
import { User, ConversationMessage, KnowledgeBase } from '../types';
import { IDatabaseService } from '../core/interfaces/IDatabaseService';
import { WorkflowContext, WorkflowStatus } from '../types/workflow';
import { KnowledgeEntry, KnowledgeCategory } from '../types/knowledge';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Mapper KnowledgeBase (DB) vers KnowledgeEntry (API)
 */
function mapKnowledgeBaseToEntry(kb: KnowledgeBase): KnowledgeEntry {
  return {
    id: kb.id,
    category: kb.category as KnowledgeCategory,
    title: kb.title,
    content: kb.content,
    keywords: kb.keywords,
    createdAt: kb.createdAt,
    updatedAt: kb.updatedAt,
    isActive: kb.isActive
  };
}

export class DatabaseService implements IDatabaseService {
  private db: Database | null = null;
  private initialized: boolean = false;

  /**
   * Initialiser la base de données
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Créer le dossier data s'il n'existe pas
      const dbDir = path.dirname(config.database.path);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Créer la connexion SQLite
      this.db = new sqlite3.Database(config.database.path, (err) => {
        if (err) {
          logger.error('Erreur lors de l\'ouverture de la base de données SQLite', { error: err });
          throw err;
        }
      });

      // Activer les clés étrangères
      await this.runQuery('PRAGMA foreign_keys = ON');
      
      // Créer les tables
      await this.createTables();
      
      this.initialized = true;
      logger.info('Base de données SQLite initialisée avec succès', { path: config.database.path });

    } catch (error) {
      logger.error('Erreur lors de l\'initialisation de la base de données SQLite', { error });
      throw error;
    }
  }

  /**
   * Exécuter une requête SQL
   */
  private runQuery(sql: string, params: unknown[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Base de données non initialisée'));
        return;
      }

      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Exécuter une requête SELECT
   */
  private getQuery(sql: string, params: unknown[] = []): Promise<Record<string, unknown> | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Base de données non initialisée'));
        return;
      }

      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as Record<string, unknown> | undefined);
        }
      });
    });
  }

  /**
   * Exécuter une requête SELECT ALL
   */
  private allQuery(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Base de données non initialisée'));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve((rows || []) as Record<string, unknown>[]);
        }
      });
    });
  }

  /**
   * S'assurer que la base de données est initialisée
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Créer les tables nécessaires
   */
  async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    try {

      // Table des utilisateurs
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

      // Table des messages de conversation
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

      // Table de la base de connaissances
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

      // Index pour optimiser les requêtes
      await this.runQuery('CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number)');
      await this.runQuery('CREATE INDEX IF NOT EXISTS idx_users_last_interaction ON users(last_interaction)');
      await this.runQuery('CREATE INDEX IF NOT EXISTS idx_conversation_messages_user_id ON conversation_messages(user_id)');
      await this.runQuery('CREATE INDEX IF NOT EXISTS idx_conversation_messages_timestamp ON conversation_messages(timestamp)');
      await this.runQuery('CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category)');
      await this.runQuery('CREATE INDEX IF NOT EXISTS idx_knowledge_base_keywords ON knowledge_base(keywords)');

      // Créer la table FTS5 pour recherche full-text optimisée
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

      // Trigger pour synchroniser automatiquement les insertions
      await this.runQuery(`
        CREATE TRIGGER IF NOT EXISTS knowledge_fts_insert
        AFTER INSERT ON knowledge_base BEGIN
          INSERT INTO knowledge_fts(rowid, category, title, content, keywords)
          VALUES (new.id, new.category, new.title, new.content, new.keywords);
        END
      `);

      // Trigger pour synchroniser automatiquement les mises à jour
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

      // Trigger pour synchroniser automatiquement les suppressions
      await this.runQuery(`
        CREATE TRIGGER IF NOT EXISTS knowledge_fts_delete
        AFTER DELETE ON knowledge_base BEGIN
          DELETE FROM knowledge_fts WHERE rowid = old.id;
        END
      `);

      // Table des contextes de workflow
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

      // Index pour les workflows
      await this.runQuery('CREATE INDEX IF NOT EXISTS idx_workflow_contexts_user_id ON workflow_contexts(user_id)');
      await this.runQuery('CREATE INDEX IF NOT EXISTS idx_workflow_contexts_status ON workflow_contexts(status)');
      await this.runQuery('CREATE INDEX IF NOT EXISTS idx_workflow_contexts_workflow_id ON workflow_contexts(workflow_id)');

      // Table pour stocker les embeddings vectoriels
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

      // Index pour optimiser les requêtes d'embeddings
      await this.runQuery('CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_knowledge_id ON knowledge_embeddings(knowledge_id)');
      await this.runQuery('CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_model ON knowledge_embeddings(model_name)');

      logger.info('Tables SQLite créées avec succès');
    } catch (error) {
      logger.error('Erreur lors de la création des tables SQLite', { error });
      throw error;
    }
  }



  /**
   * Créer ou récupérer un utilisateur
   */
  async getOrCreateUser(phoneNumber: string, name?: string): Promise<User> {
    await this.ensureInitialized();

    try {
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await this.getQuery(
        'SELECT * FROM users WHERE phone_number = ?',
        [phoneNumber]
      );

      if (existingUser) {
        const userRow = existingUser as {
          id: number;
          phone_number: string;
          name: string;
          first_name: string;
          last_name: string;
          created_at: string;
          updated_at: string;
          last_interaction: string;
          is_active: number;
          conversation_state: string;
          pending_message: string | null;
        };

        // Mettre à jour la dernière interaction
        await this.runQuery(
          'UPDATE users SET last_interaction = datetime(\'now\') WHERE id = ?',
          [userRow.id]
        );

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
          conversationState: userRow.conversation_state as User['conversationState'],
          pendingMessage: userRow.pending_message || undefined
        };
      }

      // Créer un nouvel utilisateur avec état initial 'greeting'
      const result = await this.runQuery(
        `INSERT INTO users (phone_number, name, last_interaction, conversation_state)
         VALUES (?, ?, datetime('now'), 'greeting')`,
        [phoneNumber, name || null]
      );

      const newUser: User = {
        id: result.lastID,
        phoneNumber,
        name: name || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastInteraction: new Date().toISOString(),
        isActive: true,
        conversationState: 'greeting'
      };

      logger.debug('Nouvel utilisateur créé', { userId: result.lastID, phoneNumber });
      return newUser;

    } catch (error) {
      logger.error('Erreur lors de la création/récupération de l\'utilisateur', { error, phoneNumber });
      throw error;
    }
  }

  /**
   * Mettre à jour l'état de conversation d'un utilisateur
   */
  async updateUserState(userId: number, state: User['conversationState'], name?: string, pendingMessage?: string | null): Promise<void> {
    await this.ensureInitialized();

    try {
      const updateFields = ['conversation_state = ?', 'updated_at = datetime(\'now\')'];
      const params: (string | number | null)[] = [state];

      if (name !== undefined) {
        updateFields.push('name = ?');
        params.push(name);
      }

      if (pendingMessage !== undefined) {
        updateFields.push('pending_message = ?');
        params.push(pendingMessage);
      }

      params.push(userId);

      await this.runQuery(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );

      logger.debug('État utilisateur mis à jour', { userId, state, name, hasPendingMessage: !!pendingMessage });
    } catch (error) {
      logger.error('Erreur lors de la mise à jour de l\'état utilisateur', { error, userId, state });
      throw error;
    }
  }

  /**
   * Sauvegarder un message de conversation
   */
  async saveConversationMessage(message: Omit<ConversationMessage, 'id'>): Promise<number> {
    await this.ensureInitialized();

    try {
      const result = await this.runQuery(
        `INSERT INTO conversation_messages 
         (user_id, phone_number, message_id, content, message_type, timestamp, ai_provider, metadata) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          message.userId,
          message.phoneNumber,
          message.messageId,
          message.content,
          message.messageType,
          message.timestamp,
          message.aiProvider || null,
          message.metadata ? JSON.stringify(message.metadata) : null
        ]
      );

      logger.debug('Message de conversation sauvegardé', { 
        messageId: result.lastID, 
        userId: message.userId,
        messageType: message.messageType 
      });

      return result.lastID;
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde du message', { error, message });
      throw error;
    }
  }

  /**
   * Récupérer l'historique des conversations d'un utilisateur
   */
  async getConversationHistory(userId: number, limit: number = 50): Promise<ConversationMessage[]> {
    await this.ensureInitialized();

    try {
      const rows = await this.allQuery(
        `SELECT * FROM conversation_messages 
         WHERE user_id = ? 
         ORDER BY timestamp DESC 
         LIMIT ?`,
        [userId, limit]
      );

      return rows.map(row => {
        const messageRow = row as {
          id: number;
          user_id: number;
          phone_number: string;
          message_id: string;
          content: string;
          message_type: string;
          timestamp: string;
          ai_provider: string;
          metadata: string;
        };
        
        return {
          id: messageRow.id,
          userId: messageRow.user_id,
          phoneNumber: messageRow.phone_number,
          messageId: messageRow.message_id,
          content: messageRow.content,
          messageType: messageRow.message_type as 'user' | 'bot',
          timestamp: messageRow.timestamp,
          aiProvider: messageRow.ai_provider as 'openai' | 'deepseek' | undefined,
          metadata: messageRow.metadata ? JSON.parse(messageRow.metadata) : undefined
        };
      }).reverse(); // Remettre dans l'ordre chronologique

    } catch (error) {
      logger.error('Erreur lors de la récupération de l\'historique', { error, userId });
      throw error;
    }
  }

  /**
   * Récupérer les données de la base de connaissances par mots-clés (OPTIMISÉ avec FTS5)
   */
  async searchKnowledgeBase(query: string): Promise<KnowledgeEntry[]> {
    await this.ensureInitialized();

    try {
      // Nettoyer la requête pour FTS5 (enlever caractères spéciaux)
      const cleanQuery = query.replace(/[^\w\sÀ-ÿ]/g, ' ').trim();

      if (!cleanQuery) {
        logger.warn('Requête vide après nettoyage', { originalQuery: query });
        return [];
      }

      // Convertir en requête OR pour FTS5 (chercher n'importe quel mot)
      const orQuery = cleanQuery.split(/\s+/).filter(w => w.length > 0).join(' OR ');

      // Utiliser FTS5 pour recherche optimisée avec BM25 ranking
      const rows = await this.allQuery(
        `SELECT kb.*,
                bm25(knowledge_fts) as relevance_score
         FROM knowledge_fts
         JOIN knowledge_base kb ON kb.id = knowledge_fts.rowid
         WHERE knowledge_fts MATCH ?
         AND kb.is_active = 1
         ORDER BY bm25(knowledge_fts)
         LIMIT 10`,
        [orQuery]
      );

      // Si pas de résultats avec FTS5, fallback sur l'ancienne méthode
      if (rows.length === 0) {
        logger.info('Pas de résultats FTS5, utilisation fallback', { query, cleanQuery, orQuery });
        return await this.searchKnowledgeBaseFallback(query);
      }

      return rows.map(row => {
        const knowledgeRow = row as {
          id: number;
          category: string;
          title: string;
          content: string;
          keywords: string;
          created_at: string;
          updated_at: string;
          is_active: number;
          relevance_score: number;
        };

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

    } catch (error) {
      logger.error('Erreur lors de la recherche dans la base de connaissances', { error, query });
      // Fallback en cas d'erreur FTS5
      return await this.searchKnowledgeBaseFallback(query);
    }
  }

  /**
   * Méthode de recherche fallback (ancienne méthode LIKE)
   */
  private async searchKnowledgeBaseFallback(query: string): Promise<KnowledgeEntry[]> {
    try {
      // Rechercher d'abord avec la phrase complète
      let rows = await this.allQuery(
        `SELECT * FROM knowledge_base
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
         LIMIT 10`,
        [
          `%${query}%`,
          `%${query}%`,
          `%${query}%`,
          `%${query}%`,
          `%${query}%`,
          `%${query}%`,
          `%${query}%`
        ]
      );

      // Si pas de résultats, rechercher avec des mots individuels
      if (rows.length === 0) {
        const words = query.split(/\s+/).filter(w => w.length > 2);
        logger.info('Recherche avec mots individuels', { words });

        if (words.length > 0) {
          const conditions = words.map(() =>
            '(keywords LIKE ? OR content LIKE ? OR title LIKE ? OR category LIKE ?)'
          ).join(' OR ');

          const params = words.flatMap(word => [
            `%${word}%`,
            `%${word}%`,
            `%${word}%`,
            `%${word}%`
          ]);

          rows = await this.allQuery(
            `SELECT * FROM knowledge_base
             WHERE is_active = 1
             AND (${conditions})
             LIMIT 10`,
            params
          );
        }
      }

      return rows.map(row => {
        const knowledgeRow = row as {
          id: number;
          category: string;
          title: string;
          content: string;
          keywords: string;
          created_at: string;
          updated_at: string;
          is_active: number;
        };

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
    } catch (error) {
      logger.error('Erreur dans la recherche fallback', { error, query });
      return [];
    }
  }

  /**
   * Ajouter une entrée à la base de connaissances
   */
  async addKnowledgeEntry(entry: Omit<KnowledgeBase, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    await this.ensureInitialized();

    try {
      const result = await this.runQuery(
        `INSERT INTO knowledge_base (category, title, content, keywords, is_active) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          entry.category,
          entry.title,
          entry.content,
          JSON.stringify(entry.keywords),
          entry.isActive ? 1 : 0
        ]
      );

      logger.debug('Entrée ajoutée à la base de connaissances', { 
        entryId: result.lastID,
        category: entry.category,
        title: entry.title
      });

      return result.lastID;
    } catch (error) {
      logger.error('Erreur lors de l\'ajout à la base de connaissances', { error, entry });
      throw error;
    }
  }

  /**
   * Récupérer tous les utilisateurs actifs
   */
  async getActiveUsers(): Promise<User[]> {
    await this.ensureInitialized();

    try {
      const rows = await this.allQuery(
        'SELECT * FROM users WHERE is_active = 1 ORDER BY last_interaction DESC'
      );

      return rows.map(row => {
        const userRow = row as {
          id: number;
          phone_number: string;
          name: string;
          first_name: string;
          last_name: string;
          created_at: string;
          updated_at: string;
          last_interaction: string;
          is_active: number;
          conversation_state: string;
        };
        
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
          conversationState: userRow.conversation_state as User['conversationState']
        };
      });

    } catch (error) {
      logger.error('Erreur lors de la récupération des utilisateurs actifs', { error });
      throw error;
    }
  }

  /**
   * Fermer la connexion à la base de données
   */
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            logger.error('Erreur lors de la fermeture de la base de données SQLite', { error: err });
            reject(err);
          } else {
            this.db = null;
            this.initialized = false;
            logger.info('Connexion à la base de données SQLite fermée');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Sauvegarder le contexte d'un workflow
   */
  async saveWorkflowContext(userId: number, context: WorkflowContext): Promise<void> {
    await this.ensureInitialized();

    try {
      const data = JSON.stringify(context.data);
      const history = JSON.stringify(context.history);
      const metadata = JSON.stringify(context.metadata);

      // Vérifier si un workflow actif existe déjà pour cet utilisateur
      const existing = await this.getQuery(
        'SELECT id FROM workflow_contexts WHERE user_id = ? AND status = ?',
        [userId, 'active']
      );

      if (existing) {
        // Mettre à jour le workflow existant
        await this.runQuery(
          `UPDATE workflow_contexts
           SET workflow_id = ?, current_state = ?, data = ?, history = ?,
               metadata = ?, status = ?, updated_at = ?, completed_at = ?, error_message = ?
           WHERE id = ?`,
          [
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
          ]
        );

        if (context.id === undefined) {
          context.id = existing.id as number;
        }
      } else {
        // Insérer un nouveau workflow
        const result = await this.runQuery(
          `INSERT INTO workflow_contexts
           (user_id, workflow_id, current_state, data, history, metadata, status, started_at, updated_at, completed_at, error_message)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
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
          ]
        );

        context.id = result.lastID;
      }

      logger.debug('Workflow context saved', {
        userId,
        workflowId: context.workflowId,
        contextId: context.id,
        status: context.status
      });

    } catch (error) {
      logger.error('Error saving workflow context', {
        userId,
        workflowId: context.workflowId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Charger le contexte d'un workflow actif
   */
  async loadWorkflowContext(userId: number): Promise<WorkflowContext | null> {
    await this.ensureInitialized();

    try {
      const row = await this.getQuery(
        'SELECT * FROM workflow_contexts WHERE user_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 1',
        [userId, 'active']
      );

      if (!row) {
        return null;
      }

      const context: WorkflowContext = {
        id: row.id as number,
        userId: row.user_id as number,
        workflowId: row.workflow_id as string,
        currentState: row.current_state as string,
        data: JSON.parse(row.data as string),
        history: JSON.parse(row.history as string),
        metadata: JSON.parse(row.metadata as string || '{}'),
        status: row.status as WorkflowStatus,
        startedAt: row.started_at as string,
        updatedAt: row.updated_at as string,
        completedAt: row.completed_at as string | undefined,
        errorMessage: row.error_message as string | undefined
      };

      return context;

    } catch (error) {
      logger.error('Error loading workflow context', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Charger un contexte de workflow spécifique par userId et workflowId
   * Permet de récupérer un workflow même s'il est completed
   */
  async getWorkflowContextById(userId: number, workflowId: string): Promise<WorkflowContext | null> {
    await this.ensureInitialized();

    try {
      const row = await this.getQuery(
        'SELECT * FROM workflow_contexts WHERE user_id = ? AND workflow_id = ? ORDER BY updated_at DESC LIMIT 1',
        [userId, workflowId]
      );

      if (!row) {
        return null;
      }

      const context: WorkflowContext = {
        id: row.id as number,
        userId: row.user_id as number,
        workflowId: row.workflow_id as string,
        currentState: row.current_state as string,
        data: JSON.parse(row.data as string),
        history: JSON.parse(row.history as string),
        metadata: JSON.parse(row.metadata as string || '{}'),
        status: row.status as WorkflowStatus,
        startedAt: row.started_at as string,
        updatedAt: row.updated_at as string,
        completedAt: row.completed_at as string | undefined,
        errorMessage: row.error_message as string | undefined
      };

      return context;

    } catch (error) {
      logger.error('Error loading workflow context by ID', {
        userId,
        workflowId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Obtenir toutes les entrées de la base de connaissances
   */
  async getAllKnowledgeEntries(): Promise<KnowledgeEntry[]> {
    await this.ensureInitialized();

    try {
      const rows = await this.allQuery(
        'SELECT * FROM knowledge_base WHERE is_active = 1'
      );

      return rows.map(row => mapKnowledgeBaseToEntry({
        id: row.id as number,
        category: row.category as string,
        title: row.title as string,
        content: row.content as string,
        keywords: JSON.parse(row.keywords as string),
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
        isActive: row.is_active === 1
      }));

    } catch (error) {
      logger.error('Error getting all knowledge entries', { error });
      return [];
    }
  }

  /**
   * Obtenir les entrées par catégorie
   */
  async getKnowledgeByCategory(category: string): Promise<KnowledgeEntry[]> {
    await this.ensureInitialized();

    try {
      const rows = await this.allQuery(
        'SELECT * FROM knowledge_base WHERE category = ? AND is_active = 1',
        [category]
      );

      return rows.map(row => mapKnowledgeBaseToEntry({
        id: row.id as number,
        category: row.category as string,
        title: row.title as string,
        content: row.content as string,
        keywords: JSON.parse(row.keywords as string),
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
        isActive: row.is_active === 1
      }));

    } catch (error) {
      logger.error('Error getting knowledge by category', { category, error });
      return [];
    }
  }

  /**
   * Sauvegarder un embedding pour une entrée de connaissance
   */
  async saveEmbedding(
    knowledgeId: number,
    embedding: number[],
    modelName: string
  ): Promise<void> {
    await this.ensureInitialized();

    try {
      // Convertir le tableau en Buffer pour le stockage BLOB
      const buffer = Buffer.from(new Float32Array(embedding).buffer);

      // Vérifier si un embedding existe déjà
      const existing = await this.getQuery(
        'SELECT id FROM knowledge_embeddings WHERE knowledge_id = ?',
        [knowledgeId]
      );

      if (existing) {
        // Mettre à jour
        await this.runQuery(
          `UPDATE knowledge_embeddings
           SET embedding = ?, model_name = ?, vector_dimension = ?, updated_at = datetime('now')
           WHERE knowledge_id = ?`,
          [buffer, modelName, embedding.length, knowledgeId]
        );
      } else {
        // Insérer
        await this.runQuery(
          `INSERT INTO knowledge_embeddings (knowledge_id, embedding, model_name, vector_dimension)
           VALUES (?, ?, ?, ?)`,
          [knowledgeId, buffer, modelName, embedding.length]
        );
      }

      logger.debug('Embedding sauvegardé', {
        knowledgeId,
        dimension: embedding.length,
        model: modelName
      });

    } catch (error) {
      logger.error('Error saving embedding', {
        knowledgeId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Récupérer un embedding par knowledge_id
   */
  async getEmbedding(knowledgeId: number): Promise<number[] | null> {
    await this.ensureInitialized();

    try {
      const row = await this.getQuery(
        'SELECT embedding, vector_dimension FROM knowledge_embeddings WHERE knowledge_id = ?',
        [knowledgeId]
      );

      if (!row) {
        return null;
      }

      // Convertir le BLOB en tableau de nombres
      const buffer = row.embedding as Buffer;
      const float32Array = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
      return Array.from(float32Array);

    } catch (error) {
      logger.error('Error getting embedding', { knowledgeId, error });
      return null;
    }
  }

  /**
   * Récupérer tous les embeddings
   */
  async getAllEmbeddings(): Promise<Array<{ knowledgeId: number; embedding: number[] }>> {
    await this.ensureInitialized();

    try {
      const rows = await this.allQuery(
        'SELECT knowledge_id, embedding FROM knowledge_embeddings'
      );

      return rows.map(row => {
        const buffer = row.embedding as Buffer;
        const float32Array = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);

        return {
          knowledgeId: row.knowledge_id as number,
          embedding: Array.from(float32Array)
        };
      });

    } catch (error) {
      logger.error('Error getting all embeddings', { error });
      return [];
    }
  }

  /**
   * Supprimer un embedding
   */
  async deleteEmbedding(knowledgeId: number): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.runQuery(
        'DELETE FROM knowledge_embeddings WHERE knowledge_id = ?',
        [knowledgeId]
      );

      logger.debug('Embedding supprimé', { knowledgeId });

    } catch (error) {
      logger.error('Error deleting embedding', { knowledgeId, error });
      throw error;
    }
  }

  /**
   * Vérifier si un embedding existe
   */
  async hasEmbedding(knowledgeId: number): Promise<boolean> {
    await this.ensureInitialized();

    try {
      const row = await this.getQuery(
        'SELECT 1 FROM knowledge_embeddings WHERE knowledge_id = ?',
        [knowledgeId]
      );

      return !!row;

    } catch (error) {
      logger.error('Error checking embedding existence', { knowledgeId, error });
      return false;
    }
  }

  /**
   * Obtenir les statistiques des embeddings
   */
  async getEmbeddingsStats(): Promise<{
    total: number;
    modelName: string | null;
    vectorDimension: number | null;
  }> {
    await this.ensureInitialized();

    try {
      const countRow = await this.getQuery(
        'SELECT COUNT(*) as count FROM knowledge_embeddings'
      );

      const metaRow = await this.getQuery(
        'SELECT model_name, vector_dimension FROM knowledge_embeddings LIMIT 1'
      );

      return {
        total: (countRow?.count as number) || 0,
        modelName: metaRow?.model_name as string || null,
        vectorDimension: metaRow?.vector_dimension as number || null
      };

    } catch (error) {
      logger.error('Error getting embeddings stats', { error });
      return { total: 0, modelName: null, vectorDimension: null };
    }
  }
}