import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';
import { config } from '../config';
import { logger } from '../utils/logger';
import { User, ConversationMessage, KnowledgeBase } from '../types';
import { IDatabaseService } from '../core/interfaces/IDatabaseService';
import * as path from 'path';
import * as fs from 'fs';

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
          conversation_state TEXT DEFAULT 'greeting'
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
          conversationState: userRow.conversation_state as User['conversationState'] as User['conversationState']
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
  async updateUserState(userId: number, state: User['conversationState'], name?: string): Promise<void> {
    await this.ensureInitialized();

    try {
      const updateFields = ['conversation_state = ?', 'updated_at = datetime(\'now\')'];
      const params: (string | number)[] = [state];

      if (name !== undefined) {
        updateFields.push('name = ?');
        params.push(name);
      }

      params.push(userId);

      await this.runQuery(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );

      logger.debug('État utilisateur mis à jour', { userId, state, name });
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
  async searchKnowledgeBase(query: string): Promise<KnowledgeBase[]> {
    await this.ensureInitialized();

    try {
      // Nettoyer la requête pour FTS5 (enlever caractères spéciaux)
      const cleanQuery = query.replace(/[^\w\sÀ-ÿ]/g, ' ').trim();

      if (!cleanQuery) {
        logger.warn('Requête vide après nettoyage', { originalQuery: query });
        return [];
      }

      // Utiliser FTS5 pour recherche optimisée avec BM25 ranking
      const rows = await this.allQuery(
        `SELECT kb.*,
                bm25(fts) as relevance_score
         FROM knowledge_fts fts
         JOIN knowledge_base kb ON kb.id = fts.rowid
         WHERE knowledge_fts MATCH ?
         AND kb.is_active = 1
         ORDER BY bm25(fts)
         LIMIT 10`,
        [cleanQuery]
      );

      // Si pas de résultats avec FTS5, fallback sur l'ancienne méthode
      if (rows.length === 0) {
        logger.info('Pas de résultats FTS5, utilisation fallback', { query, cleanQuery });
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

        return {
          id: knowledgeRow.id,
          category: knowledgeRow.category,
          title: knowledgeRow.title,
          content: knowledgeRow.content,
          keywords: JSON.parse(knowledgeRow.keywords),
          createdAt: knowledgeRow.created_at,
          updatedAt: knowledgeRow.updated_at,
          isActive: Boolean(knowledgeRow.is_active)
        };
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
  private async searchKnowledgeBaseFallback(query: string): Promise<KnowledgeBase[]> {
    try {
      const rows = await this.allQuery(
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

        return {
          id: knowledgeRow.id,
          category: knowledgeRow.category,
          title: knowledgeRow.title,
          content: knowledgeRow.content,
          keywords: JSON.parse(knowledgeRow.keywords),
          createdAt: knowledgeRow.created_at,
          updatedAt: knowledgeRow.updated_at,
          isActive: Boolean(knowledgeRow.is_active)
        };
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
}