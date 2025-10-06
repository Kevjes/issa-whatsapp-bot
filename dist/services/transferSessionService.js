"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferSessionService = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("../utils/logger");
const validation_1 = require("../utils/validation");
const otpAuthService_1 = require("./otpAuthService");
const templates_1 = require("../templates");
const menu_1 = require("../templates/menu");
const imageUtils_1 = require("../utils/imageUtils");
class TransferSessionService {
    constructor(bankingService, whatsappService) {
        this.bankingService = bankingService;
        this.whatsappService = whatsappService;
        this.activeSessions = new Map();
        const authService = this.bankingService ? this.bankingService.authService : null;
        this.otpAuthService = new otpAuthService_1.OtpAuthService(authService);
        setInterval(() => {
            this.cleanupExpiredSessions();
        }, 5 * 60 * 1000);
    }
    async createTransferSession(phoneNumber, senderAccount) {
        try {
            const sessionId = (0, uuid_1.v4)();
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
            let senderCurrency = 'SSP';
            try {
                const senderAccountInfo = await this.bankingService.getAccountInfo(senderAccount);
                if (senderAccountInfo && senderAccountInfo.returnValue && senderAccountInfo.returnValue.currency) {
                    senderCurrency = senderAccountInfo.returnValue.currency;
                }
            }
            catch (error) {
                logger_1.logger.warn('Failed to retrieve sender account currency, using default SSP', { senderAccount, error });
            }
            const session = {
                id: sessionId,
                phoneNumber,
                senderAccount,
                currency: senderCurrency,
                step: 'receiver_input',
                createdAt: now.toISOString(),
                expiresAt: expiresAt.toISOString()
            };
            this.activeSessions.set(sessionId, session);
            logger_1.logger.logSessionActivity(sessionId, 'session_created', {
                phoneNumber,
                senderAccount,
                currency: senderCurrency,
                step: 'receiver_input'
            });
            logger_1.logger.info('Transfer session created', { sessionId, phoneNumber, senderAccount, currency: senderCurrency });
            return sessionId;
        }
        catch (error) {
            logger_1.logger.error('Failed to create transfer session', { phoneNumber, senderAccount, error });
            throw error;
        }
    }
    async getTransferSession(phoneNumber) {
        try {
            for (const [sessionId, session] of this.activeSessions.entries()) {
                if (session.phoneNumber === phoneNumber && new Date(session.expiresAt) > new Date()) {
                    return session;
                }
            }
            return null;
        }
        catch (error) {
            logger_1.logger.error('Failed to retrieve transfer session', { phoneNumber, error });
            return null;
        }
    }
    async updateTransferSession(phoneNumber, updates) {
        try {
            const session = await this.getTransferSession(phoneNumber);
            if (!session) {
                return false;
            }
            Object.assign(session, updates);
            this.activeSessions.set(session.id, session);
            logger_1.logger.info('Transfer session updated', { sessionId: session.id, updates });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to update transfer session', { phoneNumber, error });
            return false;
        }
    }
    async closeSessionAndReturnToMenu(phoneNumber) {
        try {
            const session = await this.getTransferSession(phoneNumber);
            if (session) {
                this.activeSessions.delete(session.id);
                logger_1.logger.info('Transfer session closed due to initialization word', {
                    sessionId: session.id,
                    phoneNumber
                });
            }
            const imageSent = await this.whatsappService.sendImageMessage(phoneNumber, (0, imageUtils_1.getRandomWelcomeImage)(), '');
            if (imageSent) {
                logger_1.logger.info('Image sent successfully', { to: phoneNumber });
            }
            else {
                logger_1.logger.warn('Failed to send logo image', { to: phoneNumber });
            }
            await this.whatsappService.sendMessage(menu_1.MenuTemplates.createWelcomeMessage(phoneNumber));
        }
        catch (error) {
            logger_1.logger.error('Failed to close session and return to menu', { phoneNumber, error });
            await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createTechnicalErrorMessage(phoneNumber));
        }
    }
    async processReceiverAccountInput(phoneNumber, receiverAccount) {
        try {
            if ((0, validation_1.isInitWord)(receiverAccount)) {
                await this.closeSessionAndReturnToMenu(phoneNumber);
                return;
            }
            const session = await this.getTransferSession(phoneNumber);
            if (!session || session.step !== 'receiver_input') {
                await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createSessionExpiredMessage(phoneNumber));
                return;
            }
            if (!this.isValidAccountNumber(receiverAccount)) {
                await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createInvalidFormatMessage(phoneNumber, 'The account number must contain only digits and have between 10 and 20 characters.'));
                return;
            }
            if (receiverAccount === session.senderAccount) {
                await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createInvalidFormatMessage(phoneNumber, 'You cannot transfer to the same account.'));
                return;
            }
            let accountInfo;
            let accountHolderName = 'N/A';
            try {
                accountInfo = await this.bankingService.getAccountInfo(receiverAccount);
                if (accountInfo && accountInfo.returnValue) {
                    const accountData = accountInfo.returnValue;
                    if (accountData.owner) {
                        accountHolderName = accountData.owner;
                    }
                }
                logger_1.logger.info('Account info retrieved successfully', {
                    receiverAccount,
                    accountHolderName
                });
            }
            catch (error) {
                logger_1.logger.warn('Failed to retrieve account info, using default name', {
                    receiverAccount,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                await this.whatsappService.sendMessage(templates_1.BankingTemplates.createInvalidReceiverAccountMessage(phoneNumber));
                return;
            }
            await this.updateTransferSession(phoneNumber, {
                receiverAccount,
                receiverAccountHolder: accountHolderName,
                step: 'receiver_confirmation'
            });
            await this.whatsappService.sendMessage(templates_1.BankingTemplates.createReceiverAccountConfirmationMessage(phoneNumber, receiverAccount, accountHolderName));
        }
        catch (error) {
            logger_1.logger.error('Failed to process receiver account input', { phoneNumber, receiverAccount, error });
            await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createTechnicalErrorMessage(phoneNumber));
        }
    }
    async processAmountInput(phoneNumber, amountText) {
        try {
            if ((0, validation_1.isInitWord)(amountText)) {
                await this.closeSessionAndReturnToMenu(phoneNumber);
                return;
            }
            const session = await this.getTransferSession(phoneNumber);
            if (!session || session.step !== 'amount_input') {
                await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createSessionExpiredMessage(phoneNumber));
                return;
            }
            const amount = this.parseAmount(amountText);
            if (amount === null || amount <= 0) {
                await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createInvalidFormatMessage(phoneNumber, 'Please enter a valid amount in integer format only (example: 50, 1200). Decimal amounts are not accepted.'));
                return;
            }
            const sessionCurrency = session.currency || 'SSP';
            if (amount < 1) {
                await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createInvalidFormatMessage(phoneNumber, `The minimum transfer amount is 1 ${sessionCurrency}.`));
                return;
            }
            await this.updateTransferSession(phoneNumber, {
                amount,
                step: 'reason_input'
            });
            await this.whatsappService.sendMessage(templates_1.BankingTemplates.createReasonInputMessage(phoneNumber, amount, sessionCurrency));
        }
        catch (error) {
            logger_1.logger.error('Failed to process amount input', { phoneNumber, amountText, error });
            await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createTechnicalErrorMessage(phoneNumber));
        }
    }
    async processReasonInput(phoneNumber, reason) {
        try {
            if ((0, validation_1.isInitWord)(reason)) {
                await this.closeSessionAndReturnToMenu(phoneNumber);
                return;
            }
            const session = await this.getTransferSession(phoneNumber);
            if (!session || session.step !== 'reason_input') {
                await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createSessionExpiredMessage(phoneNumber));
                return;
            }
            if (!reason || reason.trim().length < 3) {
                await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createInvalidFormatMessage(phoneNumber, 'Please enter a valid reason (minimum 3 characters).'));
                return;
            }
            if (reason.length > 100) {
                await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createInvalidFormatMessage(phoneNumber, 'Please enter a valid reason (maximum 100 characters).'));
                return;
            }
            await this.updateTransferSession(phoneNumber, {
                reason: reason.trim(),
                step: 'preview'
            });
            const transferData = {
                senderAccount: session.senderAccount,
                receiverAccount: session.receiverAccount,
                amount: session.amount,
                reason: reason.trim(),
                currency: session.currency || 'SSP'
            };
            await this.whatsappService.sendMessage(templates_1.BankingTemplates.createTransferPreviewMessage(phoneNumber, transferData, session.receiverAccountHolder));
        }
        catch (error) {
            logger_1.logger.error('Failed to process reason input', { phoneNumber, reason, error });
            await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createTechnicalErrorMessage(phoneNumber));
        }
    }
    async initiateOtpAuthentication(phoneNumber) {
        try {
            const session = await this.getTransferSession(phoneNumber);
            if (!session || session.step !== 'preview') {
                await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createSessionExpiredMessage(phoneNumber));
                return;
            }
            const otpResult = await this.otpAuthService.sendOtp(phoneNumber);
            if (otpResult.success) {
                await this.updateTransferSession(phoneNumber, {
                    step: 'otp_verification'
                });
                await this.whatsappService.sendMessage(templates_1.BankingTemplates.createOtpRequestMessage(phoneNumber));
            }
            else {
                await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createGenericErrorMessage(phoneNumber, 'Impossible to send verification code. Please try again.'));
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to initiate OTP authentication', { phoneNumber, error });
            await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createTechnicalErrorMessage(phoneNumber));
        }
    }
    async processOtpValidation(phoneNumber, otp) {
        try {
            const session = await this.getTransferSession(phoneNumber);
            if (!session || session.step !== 'otp_verification') {
                await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createSessionExpiredMessage(phoneNumber));
                return;
            }
            if (!this.otpAuthService.isValidOtpFormat(otp)) {
                await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createInvalidFormatMessage(phoneNumber, 'Le code de vérification doit contenir 4 à 6 chiffres.'));
                return;
            }
            const validationResult = await this.otpAuthService.validateOtp(phoneNumber, otp);
            if (validationResult.success) {
                await this.executeTransfer(phoneNumber);
            }
            else {
                await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createInvalidOtpMessage(phoneNumber));
                this.activeSessions.delete(session.id);
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to process OTP validation', { phoneNumber, otp: '***', error });
            await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createTechnicalErrorMessage(phoneNumber));
        }
    }
    async executeTransfer(phoneNumber) {
        try {
            const session = await this.getTransferSession(phoneNumber);
            if (!session) {
                await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createSessionExpiredMessage(phoneNumber));
                return;
            }
            if (session.step === 'preview') {
                await this.initiateOtpAuthentication(phoneNumber);
            }
            else if (session.step === 'otp_verification') {
                await this.performActualTransfer(phoneNumber);
            }
            else {
                await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createSessionExpiredMessage(phoneNumber));
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to execute transfer', { phoneNumber, error });
            await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createTechnicalErrorMessage(phoneNumber));
        }
    }
    async performActualTransfer(phoneNumber) {
        try {
            const session = await this.getTransferSession(phoneNumber);
            if (!session) {
                await this.whatsappService.sendMessage(templates_1.ErrorTemplates.createSessionExpiredMessage(phoneNumber));
                return;
            }
            const transferRequest = {
                senderAccNo: session.senderAccount,
                receiverAccNo: session.receiverAccount,
                amount: session.amount,
                reason: session.reason,
                currencyRecAcc: 'SSP',
                benefName: session.receiverAccountHolder || 'Account holder',
                type: 'VIREMENT_SIMPLE',
                sameCustomer: true
            };
            const transferResponse = await this.bankingService.doTransfer(transferRequest);
            if (transferResponse.success) {
                const displayTransferData = {
                    senderAccount: session.senderAccount,
                    receiverAccount: transferResponse.returnValue?.recipientAccount || '',
                    amount: session.amount,
                    reason: session.reason,
                    currency: session.currency || 'SSP'
                };
                await this.whatsappService.sendMessage(templates_1.BankingTemplates.createTransferSuccessMessage(phoneNumber, transferResponse, displayTransferData));
                await this.updateTransferSession(phoneNumber, {
                    step: 'completed'
                });
                this.activeSessions.delete(session.id);
            }
            else {
                await this.whatsappService.sendMessage(templates_1.BankingTemplates.createTransferErrorMessage(phoneNumber, transferResponse.returnMsg || 'Unknown error'));
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to execute transfer', { phoneNumber, error });
            await this.whatsappService.sendMessage(templates_1.BankingTemplates.createTransferErrorMessage(phoneNumber, 'An error occurred. Please try again.'));
        }
    }
    async cancelTransfer(phoneNumber) {
        try {
            const session = await this.getTransferSession(phoneNumber);
            if (session) {
                this.activeSessions.delete(session.id);
                logger_1.logger.info('Transfer session cancelled', { sessionId: session.id, phoneNumber });
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to cancel transfer', { phoneNumber, error });
        }
    }
    cleanupExpiredSessions() {
        const now = new Date();
        let cleanedCount = 0;
        for (const [sessionId, session] of this.activeSessions.entries()) {
            if (new Date(session.expiresAt) <= now) {
                this.activeSessions.delete(sessionId);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            logger_1.logger.info('Expired transfer sessions cleaned', { count: cleanedCount });
        }
    }
    isValidAccountNumber(accountNumber) {
        const accountRegex = /^\d{10,20}$/;
        return accountRegex.test(accountNumber);
    }
    parseAmount(amountText) {
        try {
            const cleanText = amountText.replace(/\s/g, '');
            if (cleanText.includes('.') || cleanText.includes(',')) {
                return null;
            }
            if (!/^\d+$/.test(cleanText)) {
                return null;
            }
            const amount = parseInt(cleanText, 10);
            if (isNaN(amount) || !isFinite(amount)) {
                return null;
            }
            return amount;
        }
        catch {
            return null;
        }
    }
}
exports.TransferSessionService = TransferSessionService;
//# sourceMappingURL=transferSessionService.js.map