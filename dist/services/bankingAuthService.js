"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankingAuthService = void 0;
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class BankingAuthService {
    constructor(httpClient, databaseService) {
        this.currentToken = null;
        this.tokenExpiresAt = null;
        this.httpClient = httpClient;
        this.databaseService = databaseService;
    }
    async initialize() {
        try {
            await this.databaseService.initialize();
            await this.loadTokenFromDatabase();
            if (!this.isTokenValidInternal()) {
                await this.authenticateWithBankingAPI();
            }
        }
        catch (error) {
            logger_1.logger.error('Error initializing authentication service', { error });
            throw error;
        }
    }
    async getValidToken() {
        if (!this.isTokenValidInternal()) {
            await this.authenticateWithBankingAPI();
        }
        if (!this.currentToken) {
            throw new Error('Unable to obtain a valid token');
        }
        return this.currentToken;
    }
    async authenticateWithBankingAPI() {
        try {
            const authRequest = {
                username: config_1.config.banking.username,
                password: config_1.config.banking.password,
                device: config_1.config.banking.device,
                email: config_1.config.banking.email
            };
            const response = await this.httpClient.post('/auth', authRequest);
            if (response.data && response.data.token) {
                this.currentToken = response.data.token;
                this.tokenExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
                await this.saveTokenToDatabase();
            }
            else {
                throw new Error('Invalid authentication response');
            }
        }
        catch (error) {
            logger_1.logger.error('Error authenticating with banking API', { error });
            throw error;
        }
    }
    async refreshTokenInternal() {
        try {
            if (!this.currentToken) {
                await this.authenticateWithBankingAPI();
                return;
            }
            const response = await this.httpClient.get('/auth/refresh');
            if (response.data && response.data.token) {
                this.currentToken = response.data.token;
                this.tokenExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
                await this.saveTokenToDatabase();
            }
            else {
                await this.authenticateWithBankingAPI();
            }
        }
        catch (error) {
            logger_1.logger.error('Error refreshing token', { error });
            await this.authenticateWithBankingAPI();
        }
    }
    async invalidateToken() {
        this.currentToken = null;
        this.tokenExpiresAt = null;
        logger_1.logger.info('Token invalidated, a new one will be generated on the next request');
    }
    async isTokenValid() {
        return this.isTokenValidInternal();
    }
    async refreshToken() {
        await this.refreshTokenInternal();
        if (!this.currentToken) {
            throw new Error('Unable to refresh token');
        }
        return this.currentToken;
    }
    isTokenValidInternal() {
        if (!this.currentToken || !this.tokenExpiresAt) {
            return false;
        }
        const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
        return this.tokenExpiresAt > fiveMinutesFromNow;
    }
    async loadTokenFromDatabase() {
        try {
            const tokenRecord = await this.databaseService.getLatestToken();
            if (tokenRecord && new Date(tokenRecord.expiresAt) > new Date()) {
                this.currentToken = tokenRecord.token;
                this.tokenExpiresAt = new Date(tokenRecord.expiresAt);
            }
        }
        catch (error) {
            logger_1.logger.error('Error loading token from database', { error });
        }
    }
    async saveTokenToDatabase() {
        try {
            if (!this.currentToken || !this.tokenExpiresAt) {
                return;
            }
            const tokenRecord = {
                token: this.currentToken,
                expiresAt: this.tokenExpiresAt.toISOString(),
                createdAt: new Date().toISOString()
            };
            await this.databaseService.saveToken(tokenRecord);
        }
        catch (error) {
            logger_1.logger.error('Error saving token to database', { error });
        }
    }
    startTokenRefreshScheduler() {
        setInterval(async () => {
            try {
                await this.refreshTokenInternal();
            }
            catch (error) {
                logger_1.logger.error('Error refreshing token', { error });
            }
        }, 50 * 60 * 1000);
    }
}
exports.BankingAuthService = BankingAuthService;
//# sourceMappingURL=bankingAuthService.js.map