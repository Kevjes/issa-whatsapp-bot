"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const validation_1 = require("../utils/validation");
const phoneUtils_1 = require("../utils/phoneUtils");
class WhatsAppService {
    constructor(httpClient) {
        this.accessToken = config_1.config.whatsapp.accessToken;
        this.phoneNumberId = config_1.config.whatsapp.phoneNumberId;
        this.httpClient = httpClient;
    }
    async sendMessage(messageData) {
        try {
            const normalizedPhoneNumber = (0, phoneUtils_1.normalizeCameroonianPhoneNumber)(messageData.to);
            if (!(0, validation_1.validatePhoneNumber)(normalizedPhoneNumber)) {
                logger_1.logger.error('Invalid phone number', {
                    original: messageData.to,
                    normalized: normalizedPhoneNumber
                });
                return false;
            }
            const finalMessageData = {
                ...messageData,
                to: normalizedPhoneNumber
            };
            const response = await this.httpClient.post(`/${config_1.config.whatsapp.phoneNumberId}/messages`, finalMessageData);
            if (response.status === 200) {
                logger_1.logger.logWhatsAppMessage('outgoing', normalizedPhoneNumber, finalMessageData);
                logger_1.logger.info('WhatsApp message sent', {
                    to: normalizedPhoneNumber,
                    messageId: response.data.messages?.[0]?.id
                });
                return true;
            }
            else {
                logger_1.logger.error('Failed to send WhatsApp message', {
                    to: normalizedPhoneNumber,
                    status: response.status
                });
                return false;
            }
        }
        catch (error) {
            const normalizedPhoneNumber = (0, phoneUtils_1.normalizeCameroonianPhoneNumber)(messageData.to);
            logger_1.logger.error('Failed to send WhatsApp message', {
                to: normalizedPhoneNumber,
                error: error instanceof Error ? error.message : 'Unknown error',
                status: error.response?.status
            });
            return false;
        }
    }
    async sendTextMessage(to, message) {
        const messageData = {
            messaging_product: 'whatsapp',
            to: to,
            type: 'text',
            text: {
                body: message
            }
        };
        return this.sendMessage(messageData);
    }
    async sendErrorMessage(to, errorType = 'technical') {
        let errorMessage;
        switch (errorType) {
            case 'validation':
                errorMessage = "I'm sorry, I didn't understand your message. Please rephrase your request.";
                break;
            case 'rate_limit':
                errorMessage = "You're sending messages too quickly. Please wait a few moments before trying again.";
                break;
            case 'technical':
            default:
                errorMessage = "I'm having technical difficulties at the moment. Please try again in a few moments or contact our customer support.";
                break;
        }
        return this.sendTextMessage(to, errorMessage);
    }
    async sendImageMessage(to, imageUrl, caption) {
        const messageData = {
            messaging_product: 'whatsapp',
            to: to,
            type: 'image',
            image: {
                link: imageUrl,
                caption: caption
            }
        };
        return this.sendMessage(messageData);
    }
    async markMessageAsRead(messageId) {
        try {
            const markReadData = {
                messaging_product: 'whatsapp',
                status: 'read',
                message_id: messageId
            };
            const response = await this.httpClient.post(`/${config_1.config.whatsapp.phoneNumberId}/messages`, markReadData);
            return response.status === 200;
        }
        catch (error) {
            logger_1.logger.error('Failed to mark message as read', {
                messageId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }
    async sendTypingIndicator(to, messageId) {
        try {
            const normalizedPhoneNumber = (0, phoneUtils_1.normalizeCameroonianPhoneNumber)(to);
            if (!(0, validation_1.validatePhoneNumber)(normalizedPhoneNumber)) {
                logger_1.logger.error('Invalid phone number for typing indicator', {
                    original: to,
                    normalized: normalizedPhoneNumber
                });
                return false;
            }
            if (!messageId) {
                logger_1.logger.debug('No messageId provided for typing indicator, skipping', {
                    to: normalizedPhoneNumber
                });
                return true;
            }
            const typingData = {
                messaging_product: 'whatsapp',
                status: 'read',
                message_id: messageId,
                typing_indicator: {
                    type: 'text'
                }
            };
            const response = await this.httpClient.post(`/${config_1.config.whatsapp.phoneNumberId}/messages`, typingData);
            if (response.status === 200) {
                logger_1.logger.debug('Typing indicator sent successfully', {
                    to: normalizedPhoneNumber,
                    messageId
                });
                return true;
            }
            else {
                logger_1.logger.warn('Failed to send typing indicator', {
                    to: normalizedPhoneNumber,
                    status: response.status,
                    messageId
                });
                return false;
            }
        }
        catch (error) {
            logger_1.logger.error('Error sending typing indicator', {
                to,
                messageId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }
    async healthCheck() {
        try {
            const response = await this.httpClient.get(`/${this.phoneNumberId}`);
            return response.status === 200;
        }
        catch (error) {
            logger_1.logger.error('Failed health check WhatsApp', { error });
            return false;
        }
    }
    async getBusinessProfile() {
        try {
            const response = await this.httpClient.get(`/${this.phoneNumberId}`, {
                params: {
                    fields: 'display_phone_number,verified_name,quality_rating'
                }
            });
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('Failed to retrieve business profile', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {};
        }
    }
}
exports.WhatsAppService = WhatsAppService;
//# sourceMappingURL=whatsappService.js.map