import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';
import { config } from '../config';
import { logger } from '../utils/logger';
import { TokenRecord, PinSession, AccountNumber } from '../types';
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
  private runQuery(sql: string, params: any[] = []): Promise<any> {
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
  private getQuery(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Base de données non initialisée'));
        return;
      }

      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Exécuter une requête SELECT ALL
   */
  private allQuery(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Base de données non initialisée'));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
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
      // Table des tokens
      await this.runQuery(`
        CREATE TABLE IF NOT EXISTS tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          token TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Table des sessions PIN
      await this.runQuery(`
        CREATE TABLE IF NOT EXISTS pin_sessions (
          id TEXT PRIMARY KEY,
          phone_number TEXT NOT NULL,
          action TEXT NOT NULL,
          account_number TEXT,
          accounts TEXT,
          created_at DATETIME NOT NULL,
          expires_at DATETIME NOT NULL,
          last_authenticated_at DATETIME,
          is_completed INTEGER DEFAULT 0,
          is_link_used INTEGER DEFAULT 0,
          metadata TEXT
        )
      `);

      // Index pour optimiser les requêtes
      await this.runQuery('CREATE INDEX IF NOT EXISTS idx_tokens_expires_at ON tokens(expires_at)');
      await this.runQuery('CREATE INDEX IF NOT EXISTS idx_pin_sessions_phone_action ON pin_sessions(phone_number, action)');
      await this.runQuery('CREATE INDEX IF NOT EXISTS idx_pin_sessions_expires_at ON pin_sessions(expires_at)');
      await this.runQuery('CREATE INDEX IF NOT EXISTS idx_pin_sessions_last_auth ON pin_sessions(last_authenticated_at)');

      logger.info('Tables SQLite créées avec succès');
    } catch (error) {
      logger.error('Erreur lors de la création des tables SQLite', { error });
      throw error;
    }
  }

  /**
   * Sauvegarder un token
   */
  async saveToken(tokenRecord: TokenRecord): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.runQuery(
        'INSERT INTO tokens (token, expires_at) VALUES (?, ?)',
        [tokenRecord.token, tokenRecord.expiresAt]
      );
      logger.debug('Token sauvegardé avec succès');
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde du token', { error });
      throw error;
    }
  }

  /**
   * Récupérer le dernier token valide
   */
  async getLatestToken(): Promise<TokenRecord | null> {
    await this.ensureInitialized();

    try {
      const row = await this.getQuery(
        'SELECT * FROM tokens WHERE expires_at > datetime(\'now\') ORDER BY created_at DESC LIMIT 1'
      );

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        token: row.token,
        expiresAt: row.expires_at,
        createdAt: row.created_at
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération du token', { error });
      throw error;
    }
  }

  /**
   * Créer une session PIN
   */
  async createPinSession(session: PinSession): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.runQuery(
        `INSERT INTO pin_sessions 
         (id, phone_number, action, account_number, accounts, created_at, expires_at, 
          last_authenticated_at, is_completed, is_link_used, metadata) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          session.id,
          session.phoneNumber,
          session.action,
          session.accountNumber || null,
          session.accounts ? JSON.stringify(session.accounts) : null,
          session.createdAt,
          session.expiresAt,
          session.lastAuthenticatedAt || null,
          session.isCompleted ? 1 : 0,
          session.isLinkUsed ? 1 : 0,
          session.metadata ? JSON.stringify(session.metadata) : null
        ]
      );
      logger.debug('Session PIN créée avec succès', { sessionId: session.id });
    } catch (error) {
      logger.error('Erreur lors de la création de la session PIN', { error, sessionId: session.id });
      throw error;
    }
  }

  /**
   * Récupérer une session PIN
   */
  async getPinSession(sessionId: string): Promise<PinSession | null> {
    await this.ensureInitialized();

    try {
      const row = await this.getQuery(
        'SELECT * FROM pin_sessions WHERE id = ?',
        [sessionId]
      );

      if (!row) {
        return null;
      }

      const now = new Date();
      const expiresAt = new Date(row.expires_at);
      
      return {
        id: row.id,
        phoneNumber: row.phone_number,
        action: row.action,
        accountNumber: row.account_number,
        accounts: row.accounts ? JSON.parse(row.accounts) : undefined,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        lastAuthenticatedAt: row.last_authenticated_at,
        isCompleted: Boolean(row.is_completed),
        isExpired: now > expiresAt,
        isLinkUsed: Boolean(row.is_link_used),
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération de la session PIN', { error, sessionId });
      throw error;
    }
  }

  /**
   * Marquer une session PIN comme complétée
   */
  async completePinSession(sessionId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.runQuery(
        'UPDATE pin_sessions SET is_completed = 1 WHERE id = ?',
        [sessionId]
      );
      logger.debug('Session PIN marquée comme complétée', { sessionId });
    } catch (error) {
      logger.error('Erreur lors de la complétion de la session PIN', { error, sessionId });
      throw error;
    }
  }

  /**
   * Récupérer une session active par téléphone et action
   */
  async getActiveSessionByPhoneAndAction(phoneNumber: string, action: string): Promise<PinSession | null> {
    await this.ensureInitialized();

    try {
      const row = await this.getQuery(
        `SELECT * FROM pin_sessions 
         WHERE phone_number = ? AND action = ? 
         AND is_completed = 0 AND expires_at > datetime('now') 
         ORDER BY created_at DESC LIMIT 1`,
        [phoneNumber, action]
      );

      if (!row) {
        return null;
      }

      const now = new Date();
      const expiresAt = new Date(row.expires_at);
      
      return {
        id: row.id,
        phoneNumber: row.phone_number,
        action: row.action,
        accountNumber: row.account_number,
        accounts: row.accounts ? JSON.parse(row.accounts) : undefined,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        lastAuthenticatedAt: row.last_authenticated_at,
        isCompleted: Boolean(row.is_completed),
        isExpired: now > expiresAt,
        isLinkUsed: Boolean(row.is_link_used),
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération de la session active', { error, phoneNumber, action });
      throw error;
    }
  }

  /**
   * Mettre à jour le compte d'une session
   */
  async updateSessionAccount(sessionId: string, accountNumber: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.runQuery(
        'UPDATE pin_sessions SET account_number = ? WHERE id = ?',
        [accountNumber, sessionId]
      );
      logger.debug('Compte de session mis à jour', { sessionId, accountNumber });
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du compte de session', { error, sessionId, accountNumber });
      throw error;
    }
  }

  /**
   * Mettre à jour les comptes d'une session
   */
  async updateSessionAccounts(sessionId: string, accounts: AccountNumber[]): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.runQuery(
        'UPDATE pin_sessions SET accounts = ? WHERE id = ?',
        [JSON.stringify(accounts), sessionId]
      );
      logger.debug('Comptes de session mis à jour', { sessionId, accountsCount: accounts.length });
    } catch (error) {
      logger.error('Erreur lors de la mise à jour des comptes de session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Mettre à jour les métadonnées d'une session
   */
  async updateSessionMetadata(sessionId: string, metadata: any): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.runQuery(
        'UPDATE pin_sessions SET metadata = ? WHERE id = ?',
        [JSON.stringify(metadata), sessionId]
      );
      logger.debug('Métadonnées de session mises à jour', { sessionId });
    } catch (error) {
      logger.error('Erreur lors de la mise à jour des métadonnées de session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Mettre à jour la dernière authentification d'une session
   */
  async updateSessionLastAuthenticated(sessionId: string, lastAuthenticatedAt: string | null): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.runQuery(
        'UPDATE pin_sessions SET last_authenticated_at = ? WHERE id = ?',
        [lastAuthenticatedAt, sessionId]
      );
      logger.debug('Dernière authentification de session mise à jour', { sessionId, lastAuthenticatedAt });
    } catch (error) {
      logger.error('Erreur lors de la mise à jour de la dernière authentification', { error, sessionId });
      throw error;
    }
  }

  /**
   * Marquer un lien PIN comme utilisé
   */
  async markPinLinkAsUsed(sessionId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.runQuery(
        'UPDATE pin_sessions SET is_link_used = 1 WHERE id = ?',
        [sessionId]
      );
      logger.debug('Lien PIN marqué comme utilisé', { sessionId });
    } catch (error) {
      logger.error('Erreur lors du marquage du lien PIN', { error, sessionId });
      throw error;
    }
  }

  /**
   * Mettre à jour l'action d'une session
   */
  async updateSessionAction(sessionId: string, action: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.runQuery(
        'UPDATE pin_sessions SET action = ? WHERE id = ?',
        [action, sessionId]
      );
      logger.debug('Action de session mise à jour', { sessionId, action });
    } catch (error) {
      logger.error('Erreur lors de la mise à jour de l\'action de session', { error, sessionId, action });
      throw error;
    }
  }

  /**
   * Récupérer une session valide avec comptes
   */
  async getValidSessionWithAccounts(phoneNumber: string): Promise<{ session: PinSession; accounts: AccountNumber[] } | null> {
    await this.ensureInitialized();

    try {
      const row = await this.getQuery(
        `SELECT * FROM pin_sessions 
         WHERE phone_number = ? 
         AND is_completed = 0 
         AND expires_at > datetime('now') 
         AND last_authenticated_at IS NOT NULL 
         AND datetime(last_authenticated_at, '+5 minutes') > datetime('now') 
         ORDER BY last_authenticated_at DESC 
         LIMIT 1`,
        [phoneNumber]
      );

      if (!row) {
        return null;
      }

      const now = new Date();
      const expiresAt = new Date(row.expires_at);
      
      const session: PinSession = {
        id: row.id,
        phoneNumber: row.phone_number,
        action: row.action,
        accountNumber: row.account_number,
        accounts: row.accounts ? JSON.parse(row.accounts) : undefined,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        lastAuthenticatedAt: row.last_authenticated_at,
        isCompleted: Boolean(row.is_completed),
        isExpired: now > expiresAt,
        isLinkUsed: Boolean(row.is_link_used),
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      };

      const accounts = row.accounts ? JSON.parse(row.accounts) : [];
      
      return { session, accounts };
    } catch (error) {
      logger.error('Erreur lors de la récupération de la session valide avec comptes', { error, phoneNumber });
      throw error;
    }
  }

  /**
   * Nettoyer les anciens tokens
   */
  async cleanupOldTokens(): Promise<void> {
    await this.ensureInitialized();

    try {
      const result = await this.runQuery(
        'DELETE FROM tokens WHERE expires_at < datetime(\'now\')'
      );
      logger.info(`${result.changes} anciens tokens supprimés`);
    } catch (error) {
      logger.error('Erreur lors du nettoyage des anciens tokens', { error });
      throw error;
    }
  }

  /**
   * Nettoyer les sessions expirées
   */
  async cleanupExpiredSessions(): Promise<void> {
    await this.ensureInitialized();

    try {
      const result = await this.runQuery(
        'DELETE FROM pin_sessions WHERE expires_at < datetime(\'now\')'
      );
      logger.info(`${result.changes} sessions expirées supprimées`);
    } catch (error) {
      logger.error('Erreur lors du nettoyage des sessions expirées', { error });
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