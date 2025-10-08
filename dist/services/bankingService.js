"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankingService = void 0;
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const templates_1 = require("../templates");
class BankingService {
    constructor(httpClient, authService) {
        this.baseUrl = config_1.config.banking.apiUrl;
        this.authService = authService;
        this.httpClient = httpClient;
    }
    async loginWithPin(phoneNumber, pin) {
        try {
            const token = await this.authService.getValidToken();
            const response = await this.httpClient.get(`/whatsapp/loginWithPin/${phoneNumber}/${pin}`, {
                headers: {
                    'X-Auth-Token': token
                }
            });
            if (response.data?.success ?? false) {
                logger_1.logger.logAuthAttempt(phoneNumber, response.data.success, 'PIN');
                logger_1.logger.info('Login with PIN successful', {
                    phoneNumber,
                    success: response.data.success,
                    data: response.data,
                    accountsCount: response.data.accounts?.length || 0
                });
                return response.data;
            }
            else {
                const error = Error('Invalid login response');
                logger_1.logger.logAuthAttempt(phoneNumber, false, 'PIN');
                logger_1.logger.error('Error logging in with PIN', { phoneNumber, error });
                throw error;
            }
        }
        catch (error) {
            logger_1.logger.logAuthAttempt(phoneNumber, false, 'PIN');
            logger_1.logger.error('Error logging in with PIN', { phoneNumber, error });
            throw error;
        }
    }
    async getAccountBalance(accountNumber) {
        try {
            const token = await this.authService.getValidToken();
            logger_1.logger.info('Try get account balance', { accountNumber });
            const response = await this.httpClient.get(`/whatsapp/solde/${accountNumber}`, {
                headers: {
                    'X-Auth-Token': token
                }
            });
            if (response.data) {
                logger_1.logger.info('Get account balance successful', {
                    accountNumber,
                    solde: response.data.solde,
                    currency: response.data.currency
                });
                return response.data;
            }
            else {
                throw new Error('Invalid balance response');
            }
        }
        catch (error) {
            logger_1.logger.error('Error getting account balance', { accountNumber, error });
            throw error;
        }
    }
    async getAccountInfo(accountNumber) {
        try {
            const token = await this.authService.getValidToken();
            logger_1.logger.info('Try get account info', { accountNumber });
            const response = await this.httpClient.get(`/whatsapp/account/${accountNumber}`, {
                headers: {
                    'X-Auth-Token': token
                }
            });
            if (response.data) {
                logger_1.logger.info('Get account info successful', { accountNumber });
                return response.data;
            }
            else {
                throw new Error('Invalid account info response');
            }
        }
        catch (error) {
            logger_1.logger.error('Error getting account info', { accountNumber, error });
            throw error;
        }
    }
    async getAccountHistory(accountNumber, numberOfTransactions = 5) {
        try {
            const token = await this.authService.getValidToken();
            logger_1.logger.info('Try get account history', { accountNumber, numberOfTransactions });
            const response = await this.httpClient.get(`/whatsapp/accountHistoric/${accountNumber}/${numberOfTransactions}`, {
                headers: {
                    'X-Auth-Token': token
                }
            });
            if (response.data) {
                logger_1.logger.info('Get account history successful', { accountNumber, numberOfTransactions });
                return response.data;
            }
            else {
                throw new Error('Invalid account history response');
            }
        }
        catch (error) {
            logger_1.logger.error('Error getting account history', { accountNumber, error });
            throw error;
        }
    }
    formatAccountsForWhatsApp(accounts) {
        return templates_1.BankingTemplates.formatAccountsListMessage(accounts);
    }
    formatBalanceForWhatsApp(balance, accountNumber) {
        return templates_1.BankingTemplates.formatBalanceMessage(balance, accountNumber);
    }
    createAccountSelectionMessage(accounts, action) {
        const message = templates_1.BankingTemplates.createAccountSelectionMessage('', accounts, action);
        return message.interactive;
    }
    isValidPhoneNumber(phoneNumber) {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        return phoneRegex.test(phoneNumber.replace(/\s+/g, ''));
    }
    isValidPin(pin) {
        const pinRegex = /^\d{4,6}$/;
        return pinRegex.test(pin);
    }
    async validateReceiverAccount(accountNumber) {
        try {
            const token = await this.authService.getValidToken();
            logger_1.logger.info('Try validate receiver account', { accountNumber });
            const response = await this.httpClient.get(`/whatsapp/validateAccount/${accountNumber}`, {
                headers: {
                    'X-Auth-Token': token
                }
            });
            if (response.data) {
                logger_1.logger.info('Validate receiver account successful', {
                    accountNumber,
                    exists: response.data.accountExists,
                    holder: response.data.accountHolder
                });
                return response.data;
            }
            else {
                throw new Error('Invalid validation response');
            }
        }
        catch (error) {
            logger_1.logger.error('Error validating receiver account', { accountNumber, error });
            throw error;
        }
    }
    async doTransfer(transferRequest) {
        try {
            const token = await this.authService.getValidToken();
            logger_1.logger.logBankingOperation('transfer_attempt', transferRequest.senderAccNo, transferRequest.amount, {
                receiverAccount: transferRequest.receiverAccNo,
                currency: transferRequest.currencyRecAcc,
                benefName: transferRequest.benefName,
                type: transferRequest.type,
                sameCustomer: transferRequest.sameCustomer
            });
            logger_1.logger.info('Try do transfer', {
                senderAccount: transferRequest.senderAccNo,
                receiverAccount: transferRequest.receiverAccNo,
                amount: transferRequest.amount,
                currency: transferRequest.currencyRecAcc,
                benefName: transferRequest.benefName,
                type: transferRequest.type,
                sameCustomer: transferRequest.sameCustomer
            });
            const response = await this.httpClient.post('/whatsapp/doTransfer', transferRequest, {
                headers: {
                    'X-Auth-Token': token,
                    'Content-Type': 'application/json'
                }
            });
            if (response.data) {
                logger_1.logger.logBankingOperation(response.data.success ? 'transfer_success' : 'transfer_failed', transferRequest.senderAccNo, transferRequest.amount, {
                    receiverAccount: transferRequest.receiverAccNo,
                    reference: response.data.trxId,
                    message: response.data.returnMsg,
                    success: response.data.success
                });
                logger_1.logger.info('Do transfer successful', {
                    success: response.data.success,
                    reference: response.data.trxId,
                    message: response.data.returnMsg,
                    data: response.data,
                    senderAccount: transferRequest.senderAccNo,
                    receiverAccount: transferRequest.receiverAccNo
                });
                return response.data;
            }
            else {
                throw new Error('Invalid transfer response');
            }
        }
        catch (error) {
            logger_1.logger.logBankingOperation('transfer_error', transferRequest.senderAccNo, transferRequest.amount, {
                receiverAccount: transferRequest.receiverAccNo,
                error: error instanceof Error ? error.message : String(error)
            });
            logger_1.logger.error('Error doing transfer', { transferRequest, error });
            throw error;
        }
    }
    async changePin(phoneNumber, currentPin, newPin) {
        try {
            const token = await this.authService.getValidToken();
            logger_1.logger.info('Try change PIN', { phoneNumber });
            const requestBody = {
                phoneNumber,
                oldPin: currentPin,
                newPin: newPin,
                confirmPin: newPin
            };
            const response = await this.httpClient.put('/whatsapp/pin', requestBody, {
                headers: {
                    'X-Auth-Token': token,
                    'Content-Type': 'application/json'
                }
            });
            if (response.status === 200) {
                logger_1.logger.info('Change PIN successful', {
                    phoneNumber,
                    success: response.data.success
                });
                return true;
            }
            else {
                throw new Error('Invalid change PIN response');
            }
        }
        catch (error) {
            logger_1.logger.error('Error changing PIN', { phoneNumber, error });
            throw error;
        }
    }
    async initiateOtpAuthentication(phoneNumber) {
        try {
            const token = await this.authService.getValidToken();
            logger_1.logger.info('Try initiate OTP authentication', { phoneNumber });
            const response = await this.httpClient.get(`/whatsapp/login/${phoneNumber}`, {
                headers: {
                    'X-Auth-Token': token
                }
            });
            if (response.status === 200) {
                logger_1.logger.info('OTP authentication initiated successfully', { phoneNumber });
                return response.data;
            }
            else {
                throw new Error('Failed to initiate OTP authentication');
            }
        }
        catch (error) {
            logger_1.logger.error('Error initiating OTP authentication', { phoneNumber, error });
            throw error;
        }
    }
    async validateOtp(phoneNumber, otp) {
        try {
            const token = await this.authService.getValidToken();
            logger_1.logger.info('Try validate OTP', { phoneNumber });
            const response = await this.httpClient.get(`/whatsapp/validate/login/${phoneNumber}/${otp}`, {
                headers: {
                    'X-Auth-Token': token
                }
            });
            if (response.status === 200) {
                logger_1.logger.info('OTP validation successful', { phoneNumber });
                return {
                    success: true,
                    data: response.data
                };
            }
            else {
                logger_1.logger.warn('OTP validation failed', { phoneNumber, status: response.status });
                return {
                    success: false,
                    message: 'Invalid OTP'
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Error validating OTP', { phoneNumber, error });
            return {
                success: false,
                message: 'OTP validation failed'
            };
        }
    }
}
exports.BankingService = BankingService;
//# sourceMappingURL=bankingService.js.map