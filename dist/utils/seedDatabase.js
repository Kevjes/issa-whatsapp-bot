"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseSeeder = void 0;
const logger_1 = require("./logger");
class DatabaseSeeder {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async seedTestData() {
        try {
            const db = this.databaseService.getDatabase();
            const users = [
                {
                    phone_number: '+249123456789',
                    first_name: 'Ahmed',
                    last_name: 'Hassan',
                    status: 'active',
                    last_activity: new Date().toISOString(),
                    created_at: new Date().toISOString()
                },
                {
                    phone_number: '+249987654321',
                    first_name: 'Fatima',
                    last_name: 'Ali',
                    status: 'active',
                    last_activity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    phone_number: '+249555666777',
                    first_name: 'Omar',
                    last_name: 'Mohamed',
                    status: 'inactive',
                    last_activity: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
                }
            ];
            for (const user of users) {
                await new Promise((resolve, reject) => {
                    db.run(`INSERT OR REPLACE INTO users (phone_number, first_name, last_name, status, last_activity, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`, [user.phone_number, user.first_name, user.last_name, user.status, user.last_activity, user.created_at], (err) => {
                        if (err)
                            reject(err);
                        else
                            resolve();
                    });
                });
            }
            const sessions = [
                {
                    id: 'session_1',
                    phone_number: '+249123456789',
                    action: 'transfer',
                    account_number: '1234567890',
                    created_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
                    last_authenticated_at: new Date().toISOString(),
                    completed: 0,
                    is_link_used: 1
                },
                {
                    id: 'session_2',
                    phone_number: '+249987654321',
                    action: 'balance',
                    account_number: '0987654321',
                    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                    expires_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
                    last_authenticated_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
                    completed: 1,
                    is_link_used: 1
                },
                {
                    id: 'session_3',
                    phone_number: '+249555666777',
                    action: 'transfer',
                    account_number: '5555666777',
                    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                    expires_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                    last_authenticated_at: null,
                    completed: 0,
                    is_link_used: 0
                }
            ];
            for (const session of sessions) {
                await new Promise((resolve, reject) => {
                    db.run(`INSERT OR REPLACE INTO pin_sessions (id, phone_number, action, account_number, created_at, expires_at, last_authenticated_at, completed, is_link_used)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [session.id, session.phone_number, session.action, session.account_number, session.created_at, session.expires_at, session.last_authenticated_at, session.completed, session.is_link_used], (err) => {
                        if (err)
                            reject(err);
                        else
                            resolve();
                    });
                });
            }
            const transfers = [
                {
                    id: 'transfer_1',
                    phone_number: '+249123456789',
                    from_account: '1234567890',
                    to_account: '0987654321',
                    amount: 1000.00,
                    currency: 'SSP',
                    status: 'completed',
                    created_at: new Date().toISOString(),
                    completed_at: new Date().toISOString()
                },
                {
                    id: 'transfer_2',
                    phone_number: '+249987654321',
                    from_account: '0987654321',
                    to_account: '5555666777',
                    amount: 500.00,
                    currency: 'SSP',
                    status: 'completed',
                    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
                    completed_at: new Date(Date.now() - 50 * 60 * 1000).toISOString()
                },
                {
                    id: 'transfer_3',
                    phone_number: '+249555666777',
                    from_account: '5555666777',
                    to_account: '1234567890',
                    amount: 250.00,
                    currency: 'SSP',
                    status: 'failed',
                    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                    error_message: 'Insufficient funds'
                },
                {
                    id: 'transfer_4',
                    phone_number: '+249123456789',
                    from_account: '1234567890',
                    to_account: '0987654321',
                    amount: 750.00,
                    currency: 'SSP',
                    status: 'pending',
                    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
                }
            ];
            for (const transfer of transfers) {
                await new Promise((resolve, reject) => {
                    db.run(`INSERT OR REPLACE INTO transfers (id, phone_number, from_account, to_account, amount, currency, status, created_at, completed_at, error_message)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [transfer.id, transfer.phone_number, transfer.from_account, transfer.to_account, transfer.amount, transfer.currency, transfer.status, transfer.created_at, transfer.completed_at || null, transfer.error_message || null], (err) => {
                        if (err)
                            reject(err);
                        else
                            resolve();
                    });
                });
            }
            const logs = [
                {
                    level: 'info',
                    message: 'User authenticated successfully',
                    phone_number: '+249123456789',
                    session_id: 'session_1',
                    timestamp: new Date().toISOString(),
                    metadata: JSON.stringify({ action: 'login', ip: '192.168.1.1' })
                },
                {
                    level: 'error',
                    message: 'Transfer failed due to insufficient funds',
                    phone_number: '+249555666777',
                    session_id: 'session_3',
                    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                    metadata: JSON.stringify({ transfer_id: 'transfer_3', amount: 250.00 })
                },
                {
                    level: 'warn',
                    message: 'Multiple failed login attempts detected',
                    phone_number: '+249987654321',
                    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
                    metadata: JSON.stringify({ attempts: 3, ip: '192.168.1.2' })
                },
                {
                    level: 'info',
                    message: 'Transfer completed successfully',
                    phone_number: '+249987654321',
                    timestamp: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
                    metadata: JSON.stringify({ transfer_id: 'transfer_2', amount: 500.00 })
                }
            ];
            for (const log of logs) {
                await new Promise((resolve, reject) => {
                    db.run(`INSERT INTO logs (level, message, phone_number, session_id, timestamp, metadata)
             VALUES (?, ?, ?, ?, ?, ?)`, [log.level, log.message, log.phone_number, log.session_id || null, log.timestamp, log.metadata], (err) => {
                        if (err)
                            reject(err);
                        else
                            resolve();
                    });
                });
            }
            logger_1.logger.info('Données de test insérées avec succès dans la base de données');
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de l\'insertion des données de test', { error });
            throw error;
        }
    }
    async clearTestData() {
        try {
            const db = this.databaseService.getDatabase();
            const tables = ['users', 'pin_sessions', 'transfers', 'logs'];
            for (const table of tables) {
                await new Promise((resolve, reject) => {
                    db.run(`DELETE FROM ${table}`, (err) => {
                        if (err)
                            reject(err);
                        else
                            resolve();
                    });
                });
            }
            logger_1.logger.info('Données de test supprimées avec succès');
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de la suppression des données de test', { error });
            throw error;
        }
    }
}
exports.DatabaseSeeder = DatabaseSeeder;
//# sourceMappingURL=seedDatabase.js.map