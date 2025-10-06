"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PinSessionService = void 0;
const uuid_1 = require("uuid");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const templates_1 = require("../templates");
class PinSessionService {
    constructor(databaseService, bankingService, whatsappService, transferSessionService) {
        this.databaseService = databaseService;
        this.bankingService = bankingService;
        this.whatsappService = whatsappService;
        this.transferSessionService = transferSessionService;
        this.activeSessions = new Map();
        setInterval(() => {
            this.cleanupExpiredSessions();
        }, 5 * 60 * 1000);
    }
    async createPinSession(phoneNumber, action, accountNumber) {
        try {
            const sessionId = (0, uuid_1.v4)();
            const now = new Date();
            const expiresAt = new Date(now.getTime() + config_1.config.pin.sessionTimeoutMinutes * 60 * 1000);
            const session = {
                id: sessionId,
                phoneNumber,
                action,
                accountNumber,
                createdAt: now.toISOString(),
                expiresAt: expiresAt.toISOString(),
                isCompleted: false,
                isExpired: false,
                isLinkUsed: false
            };
            await this.databaseService.createPinSession(session);
            this.activeSessions.set(sessionId, session);
            logger_1.logger.info('Session PIN created', { sessionId, phoneNumber, action });
            return sessionId;
        }
        catch (error) {
            logger_1.logger.error('Error creating session PIN', { phoneNumber, action, error });
            throw error;
        }
    }
    generatePinLink(sessionId) {
        const baseUrl = config_1.config.pin.baseUrl;
        return `${baseUrl}/pin/${sessionId}`;
    }
    async getPinSession(sessionId) {
        try {
            let session = this.activeSessions.get(sessionId);
            if (!session) {
                const dbSession = await this.databaseService.getPinSession(sessionId);
                session = dbSession || undefined;
                if (session) {
                    this.activeSessions.set(sessionId, session);
                }
            }
            if (session && new Date(session.expiresAt) > new Date() && !session.isCompleted) {
                return session;
            }
            return null;
        }
        catch (error) {
            logger_1.logger.error('Error retrieving session PIN', { sessionId, error });
            return null;
        }
    }
    async processPinSubmission(sessionId, pin) {
        try {
            const session = await this.getPinSession(sessionId);
            if (!session) {
                return templates_1.AuthTemplates.createInvalidSessionMessage();
            }
            if (session.isLinkUsed) {
                logger_1.logger.warn('Pin link already used', { sessionId, phoneNumber: session.phoneNumber });
                return {
                    success: false,
                    message: 'This link has already been used. Please restart from WhatsApp.'
                };
            }
            await this.databaseService.markPinLinkAsUsed(sessionId);
            session.isLinkUsed = true;
            this.activeSessions.set(sessionId, session);
            if (!this.bankingService.isValidPin(pin)) {
                return templates_1.AuthTemplates.createInvalidPinApiMessage();
            }
            await this.processAction(session, pin);
            return templates_1.AuthTemplates.createPinValidationSuccessMessage();
        }
        catch (error) {
            logger_1.logger.error('Error processing PIN', { sessionId, error });
            return templates_1.AuthTemplates.createPinProcessingErrorMessage();
        }
    }
    async processAction(session, pin) {
        try {
            logger_1.logger.info('Processing action', { sessionId: session.id, action: session.action });
            if (session.action === 'new_pin_input') {
                await this.handleNewPinInput(session, pin);
                return;
            }
            const loginResponse = await this.bankingService.loginWithPin(session.phoneNumber, pin);
            if (!loginResponse.success) {
                await this.whatsappService.sendMessage(templates_1.AuthTemplates.createAuthErrorMessage(session.phoneNumber, loginResponse.message));
                return;
            }
            if (loginResponse.accounts && loginResponse.accounts.length > 0) {
                session.accounts = loginResponse.accounts;
                const lastAuthenticatedAt = new Date().toISOString();
                await this.databaseService.updateSessionAccounts(session.id, loginResponse.accounts);
                await this.databaseService.updateSessionLastAuthenticated(session.id, lastAuthenticatedAt);
                session.accounts = loginResponse.accounts;
                session.lastAuthenticatedAt = lastAuthenticatedAt;
                this.activeSessions.set(session.id, session);
                logger_1.logger.info('Bank accounts saved in session', { sessionId: session.id, accountsCount: loginResponse.accounts.length });
            }
            switch (session.action) {
                case 'balance':
                    await this.handleBalanceAction(session, loginResponse.accounts || []);
                    break;
                case 'info':
                    await this.handleAccountInfoAction(session, loginResponse.accounts || []);
                    break;
                case 'statement':
                    await this.handleMiniStatementAction(session, loginResponse.accounts || []);
                    break;
                case 'transfer':
                    await this.handleTransferAction(session, loginResponse.accounts || []);
                    break;
                case 'change_pin':
                    await this.handleChangePinAction(session, pin);
                    break;
                default:
                    await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createUnknownOptionMessage(session.phoneNumber));
            }
        }
        catch (error) {
            logger_1.logger.error('Error processing action', { sessionId: session.id, error });
            await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createTechnicalErrorMessage(session.phoneNumber));
        }
    }
    async handleBalanceAction(session, accounts) {
        if (session.accountNumber) {
            const balance = await this.bankingService.getAccountBalance(session.accountNumber);
            await this.whatsappService.sendMessage(templates_1.BankingTemplates.createBalanceMessage(session.phoneNumber, balance, session.accountNumber));
        }
        else {
            await this.whatsappService.sendMessage(templates_1.BankingTemplates.createAccountSelectionMessage(session.phoneNumber, accounts, 'balance'));
        }
    }
    async handleAccountInfoAction(session, accounts) {
        if (session.accountNumber) {
            const accountInfo = await this.bankingService.getAccountInfo(session.accountNumber);
            await this.whatsappService.sendMessage(templates_1.BankingTemplates.createAccountInfoMessage(session.phoneNumber, accountInfo, session.accountNumber));
        }
        else {
            await this.whatsappService.sendMessage(templates_1.BankingTemplates.createAccountSelectionMessage(session.phoneNumber, accounts, 'info'));
        }
    }
    async handleMiniStatementAction(session, accounts) {
        if (session.accountNumber) {
            const history = await this.bankingService.getAccountHistory(session.accountNumber, 5);
            const accountInfo = accounts.find(acc => acc.accountValue === session.accountNumber);
            const accountCurrency = accountInfo?.currency;
            await this.whatsappService.sendMessage(templates_1.BankingTemplates.createMiniStatementMessage(session.phoneNumber, history, session.accountNumber, accountCurrency));
        }
        else {
            await this.whatsappService.sendMessage(templates_1.BankingTemplates.createAccountSelectionMessage(session.phoneNumber, accounts, 'statement'));
        }
    }
    async handleTransferAction(session, accounts) {
        if (session.accountNumber) {
            if (this.transferSessionService) {
                const transferSessionId = await this.transferSessionService.createTransferSession(session.phoneNumber, session.accountNumber);
                await this.whatsappService.sendMessage(templates_1.BankingTemplates.createReceiverAccountInputMessage(session.phoneNumber, session.accountNumber));
                logger_1.logger.info('Transfer session created', {
                    pinSessionId: session.id,
                    transferSessionId,
                    senderAccount: session.accountNumber
                });
            }
            else {
                logger_1.logger.error('TransferSessionService not available');
                await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createTechnicalErrorMessage(session.phoneNumber));
            }
        }
        else {
            await this.whatsappService.sendMessage(templates_1.BankingTemplates.createAccountSelectionMessage(session.phoneNumber, accounts, 'transfer'));
        }
    }
    async handleChangePinAction(session, currentPin) {
        try {
            const newPinSessionId = await this.createPinSession(session.phoneNumber, 'new_pin_input');
            const newPinLink = this.generatePinLink(newPinSessionId);
            const newPinSession = this.activeSessions.get(newPinSessionId);
            if (newPinSession) {
                newPinSession.metadata = { currentPin };
                this.activeSessions.set(newPinSessionId, newPinSession);
                await this.databaseService.updateSessionMetadata(newPinSessionId, { currentPin });
            }
            await this.whatsappService.sendMessage(templates_1.AuthTemplates.createNewPinRequestMessage(session.phoneNumber, newPinLink));
            await this.completePinSession(session.id);
            logger_1.logger.info('Change PIN workflow initiated', {
                sessionId: session.id,
                newPinSessionId,
                phoneNumber: session.phoneNumber
            });
        }
        catch (error) {
            logger_1.logger.error('Error handling change PIN action', { sessionId: session.id, error });
            await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createTechnicalErrorMessage(session.phoneNumber));
        }
    }
    async handleNewPinInput(session, newPin) {
        try {
            const currentPin = session.metadata?.currentPin;
            if (!currentPin) {
                logger_1.logger.error('Current PIN not found in session metadata', { sessionId: session.id });
                await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createTechnicalErrorMessage(session.phoneNumber));
                return;
            }
            if (!this.bankingService.isValidPin(newPin)) {
                await this.whatsappService.sendMessage(templates_1.AuthTemplates.createInvalidPinMessage(session.phoneNumber));
                return;
            }
            if (currentPin === newPin) {
                await this.whatsappService.sendMessage(templates_1.AuthTemplates.createSamePinErrorMessage(session.phoneNumber));
                return;
            }
            const changeResult = await this.bankingService.changePin(session.phoneNumber, currentPin, newPin);
            if (changeResult.success) {
                await this.whatsappService.sendMessage(templates_1.AuthTemplates.createPinChangeSuccessMessage(session.phoneNumber));
                logger_1.logger.info('PIN changed successfully', {
                    sessionId: session.id,
                    phoneNumber: session.phoneNumber
                });
            }
            else {
                await this.whatsappService.sendMessage(templates_1.AuthTemplates.createPinChangeErrorMessage(session.phoneNumber, changeResult.message));
                logger_1.logger.error('PIN change failed', {
                    sessionId: session.id,
                    phoneNumber: session.phoneNumber,
                    error: changeResult.message
                });
            }
            await this.completePinSession(session.id);
        }
        catch (error) {
            logger_1.logger.error('Error handling new PIN input', { sessionId: session.id, error });
            await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createTechnicalErrorMessage(session.phoneNumber));
        }
    }
    async completePinSession(sessionId) {
        try {
            await this.databaseService.completePinSession(sessionId);
            const session = this.activeSessions.get(sessionId);
            if (session) {
                session.isCompleted = true;
                this.activeSessions.set(sessionId, session);
            }
            logger_1.logger.info('Session PIN marked as completed', { sessionId });
        }
        catch (error) {
            logger_1.logger.error('Error completing session PIN', { sessionId, error });
        }
    }
    async submitPin(sessionId, pin) {
        return await this.processPinSubmission(sessionId, pin);
    }
    async getActiveSessionByPhoneAndAction(phoneNumber, action) {
        try {
            for (const [sessionId, session] of this.activeSessions.entries()) {
                if (session.phoneNumber === phoneNumber &&
                    session.action === action &&
                    !session.isCompleted &&
                    new Date(session.expiresAt) > new Date()) {
                    return session;
                }
            }
            const dbSession = await this.databaseService.getActiveSessionByPhoneAndAction(phoneNumber, action);
            if (dbSession) {
                this.activeSessions.set(dbSession.id, dbSession);
                return dbSession;
            }
            return null;
        }
        catch (error) {
            logger_1.logger.error('Error retrieving active session', { phoneNumber, action, error });
            return null;
        }
    }
    async getValidSessionWithAccounts(phoneNumber) {
        try {
            const now = new Date();
            const pinValidityDuration = config_1.config.pin.sessionTimeoutMinutes * 60 * 1000;
            for (const [sessionId, session] of this.activeSessions.entries()) {
                if (session.phoneNumber === phoneNumber &&
                    !session.isCompleted &&
                    new Date(session.expiresAt) > now &&
                    session.accounts && session.accounts.length > 0) {
                    if (session.lastAuthenticatedAt) {
                        const lastAuthTime = new Date(session.lastAuthenticatedAt);
                        const timeSinceAuth = now.getTime() - lastAuthTime.getTime();
                        if (timeSinceAuth <= pinValidityDuration) {
                            logger_1.logger.info("PIN apparement valide", {
                                sessionId,
                                session,
                                timeSinceAuth: Math.round(timeSinceAuth / 1000 / 60) + ' minutes'
                            });
                            return { session, accounts: session.accounts };
                        }
                        else {
                            logger_1.logger.info('PIN authentication expired for session', {
                                sessionId,
                                phoneNumber,
                                timeSinceAuth: Math.round(timeSinceAuth / 1000 / 60) + ' minutes'
                            });
                            session.accounts = undefined;
                            session.lastAuthenticatedAt = undefined;
                            this.activeSessions.set(sessionId, session);
                            this.databaseService.updateSessionLastAuthenticated(sessionId, null);
                            this.databaseService.updateSessionAccounts(sessionId, []);
                        }
                    }
                }
            }
            const dbSession = await this.databaseService.getValidSessionWithAccounts(phoneNumber);
            if (dbSession && dbSession.accounts && dbSession.accounts.length > 0) {
                if (dbSession.session.lastAuthenticatedAt) {
                    const lastAuthTime = new Date(dbSession.session.lastAuthenticatedAt);
                    const timeSinceAuth = now.getTime() - lastAuthTime.getTime();
                    if (timeSinceAuth <= pinValidityDuration) {
                        this.activeSessions.set(dbSession.session.id, dbSession.session);
                        return { session: dbSession.session, accounts: dbSession.accounts };
                    }
                    else {
                        logger_1.logger.info('PIN authentication expired for DB session', {
                            sessionId: dbSession.session.id,
                            phoneNumber,
                            timeSinceAuth: Math.round(timeSinceAuth / 1000 / 60) + ' minutes'
                        });
                    }
                }
            }
            return null;
        }
        catch (error) {
            logger_1.logger.error('Error retrieving valid session with accounts', { phoneNumber, error });
            return null;
        }
    }
    async updateSessionAccount(sessionId, accountNumber) {
        try {
            const session = this.activeSessions.get(sessionId);
            if (session) {
                session.accountNumber = accountNumber;
                this.activeSessions.set(sessionId, session);
            }
            await this.databaseService.updateSessionAccount(sessionId, accountNumber);
            logger_1.logger.info('Account number updated for session', { sessionId, accountNumber });
        }
        catch (error) {
            logger_1.logger.error('Error updating session account', { sessionId, accountNumber, error });
            throw error;
        }
    }
    async updateSessionAction(sessionId, action) {
        try {
            const session = this.activeSessions.get(sessionId);
            if (session) {
                session.action = action;
                this.activeSessions.set(sessionId, session);
            }
            await this.databaseService.updateSessionAction(sessionId, action);
            logger_1.logger.info('Action updated for session', { sessionId, action });
        }
        catch (error) {
            logger_1.logger.error('Error updating session action', { sessionId, action, error });
            throw error;
        }
    }
    async processActionWithAccount(sessionId) {
        try {
            const session = await this.databaseService.getPinSession(sessionId);
            if (!session) {
                throw new Error('Session non trouvée');
            }
            if (!session.accountNumber) {
                throw new Error('Numéro de compte manquant');
            }
            switch (session.action) {
                case 'balance':
                    await this.processBalanceForAccount(session);
                    break;
                case 'statement':
                    await this.processMiniStatementForAccount(session);
                    break;
                case 'info':
                    await this.processAccountInfoForAccount(session);
                    break;
                case 'transfer':
                    await this.processTransferForAccount(session);
                    break;
                default:
                    throw new Error(`Action not supported: ${session.action}`);
            }
            logger_1.logger.info('Action processed successfully, session remains active', { sessionId, action: session.action });
        }
        catch (error) {
            logger_1.logger.error('Error processing action with account', { sessionId, error });
            throw error;
        }
    }
    async processBalanceForAccount(session) {
        const balance = await this.bankingService.getAccountBalance(session.accountNumber);
        await this.whatsappService.sendMessage(templates_1.BankingTemplates.createBalanceMessage(session.phoneNumber, balance, session.accountNumber));
    }
    async processMiniStatementForAccount(session) {
        const history = await this.bankingService.getAccountHistory(session.accountNumber, 5);
        let accountCurrency;
        try {
            const accountInfo = await this.bankingService.getAccountInfo(session.accountNumber);
            if (accountInfo && accountInfo.returnValue && accountInfo.returnValue.currency) {
                accountCurrency = accountInfo.returnValue.currency;
            }
        }
        catch (error) {
            logger_1.logger.warn('Could not retrieve account currency for mini statement', { accountNumber: session.accountNumber, error });
        }
        await this.whatsappService.sendMessage(templates_1.BankingTemplates.createMiniStatementMessage(session.phoneNumber, history, session.accountNumber, accountCurrency));
    }
    async processAccountInfoForAccount(session) {
        const accountInfo = await this.bankingService.getAccountInfo(session.accountNumber);
        await this.whatsappService.sendMessage(templates_1.BankingTemplates.createAccountInfoMessage(session.phoneNumber, accountInfo, session.accountNumber));
    }
    async processTransferForAccount(session) {
        if (!session.accountNumber) {
            throw new Error('Account number missing for transfer action');
        }
        if (this.transferSessionService) {
            const transferSessionId = await this.transferSessionService.createTransferSession(session.phoneNumber, session.accountNumber);
            await this.whatsappService.sendMessage(templates_1.BankingTemplates.createReceiverAccountInputMessage(session.phoneNumber, session.accountNumber));
            logger_1.logger.info('Transfer session created from PIN', {
                pinSessionId: session.id,
                transferSessionId,
                senderAccount: session.accountNumber
            });
        }
        else {
            logger_1.logger.error('TransferSessionService not available');
            await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createTechnicalErrorMessage(session.phoneNumber));
        }
    }
    async cleanupExpiredSessions() {
        try {
            const now = new Date();
            for (const [sessionId, session] of this.activeSessions.entries()) {
                if (new Date(session.expiresAt) <= now || session.isCompleted) {
                    this.activeSessions.delete(sessionId);
                }
            }
            await this.databaseService.cleanupExpiredSessions();
            logger_1.logger.debug('Expired sessions cleaned up');
        }
        catch (error) {
            logger_1.logger.error('Error cleaning up expired sessions', { error });
        }
    }
    createPinRequestMessage(sessionId, action) {
        const pinLink = this.generatePinLink(sessionId);
        const actionText = {
            'balance': 'check your balance',
            'info': 'view your account information',
            'statement': 'obtain your mini statement'
        }[action] || 'perform this operation';
        return `🔐 *PIN required*\n\n` +
            `To ${actionText}, please click on the link below to enter your PIN :\n\n` +
            `🔗 ${pinLink}\n\n` +
            `⏰ This link expires in 10 minutes.\n` +
            `🔒 Your PIN is secure and will never be stored.`;
    }
}
exports.PinSessionService = PinSessionService;
//# sourceMappingURL=pinSessionService.js.map