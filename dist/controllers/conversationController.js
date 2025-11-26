"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationController = void 0;
const validation_1 = require("../utils/validation");
const logger_1 = require("../utils/logger");
const rateLimiter_1 = require("../middlewares/rateLimiter");
class ConversationController {
    constructor(conversationService, whatsappService) {
        this.conversationService = conversationService;
        this.whatsappService = whatsappService;
    }
    async handleIncomingMessage(req, res) {
        try {
            const whatsappMessage = req.body;
            logger_1.logger.info('Message WhatsApp received', {
                messageData: whatsappMessage
            });
            const messageData = (0, validation_1.extractTextFromWhatsAppMessage)(whatsappMessage);
            if (!messageData) {
                logger_1.logger.info('Message is not text or invalid - ignored');
                res.status(200).json({ status: 'ignored' });
                return;
            }
            const { text, from, messageId } = messageData;
            logger_1.logger.info('Text message extracted', {
                from,
                messageId,
                textLength: text.length,
                preview: text.substring(0, 50)
            });
            const rateLimitResult = rateLimiter_1.userRateLimiter.check(from);
            if (!rateLimitResult.allowed) {
                logger_1.logger.warn('Rate limit exceeded for user', {
                    from,
                    resetTime: rateLimitResult.resetTime
                });
                await this.whatsappService.sendErrorMessage(from, 'rate_limit');
                res.status(200).json({ status: 'rate_limited' });
                return;
            }
            await this.whatsappService.markMessageAsRead(messageId);
            this.processMessageAsync(text, from, messageId);
            res.status(200).json({ status: 'received' });
        }
        catch (error) {
            logger_1.logger.error('Error processing incoming message', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                body: req.body
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async processMessageAsync(text, from, messageId) {
        try {
            logger_1.logger.info('Asynchronous message processing started', {
                from,
                messageId,
                textPreview: text.substring(0, 100)
            });
            const result = await this.conversationService.processMessage(from, messageId, text);
            if (!result.response) {
                logger_1.logger.error('No response generated from conversation service', {
                    from,
                    messageId
                });
                await this.whatsappService.sendErrorMessage(from, 'technical');
                return;
            }
            const messageSent = await this.whatsappService.sendTextMessage(from, result.response);
            if (messageSent) {
                logger_1.logger.info('Response sent successfully', {
                    from,
                    messageId,
                    responseLength: result.response.length,
                    shouldContinue: result.shouldContinue
                });
            }
            else {
                logger_1.logger.error('Failed to send WhatsApp response', {
                    from,
                    messageId
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Error processing asynchronous message', {
                from,
                messageId,
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            try {
                await this.whatsappService.sendErrorMessage(from, 'technical');
            }
            catch (sendError) {
                logger_1.logger.error('Failed to send error message', {
                    from,
                    sendError: sendError instanceof Error ? sendError.message : 'Unknown error'
                });
            }
        }
    }
    async handleMessageStatus(req, res) {
        try {
            const whatsappMessage = req.body;
            const entry = whatsappMessage.entry[0];
            const change = entry.changes[0];
            const statuses = change.value.statuses;
            if (statuses && statuses.length > 0) {
                for (const status of statuses) {
                    logger_1.logger.info('Message status received', {
                        messageId: status.id,
                        status: status.status,
                        recipientId: status.recipient_id,
                        timestamp: status.timestamp
                    });
                }
            }
            res.status(200).json({ status: 'processed' });
        }
        catch (error) {
            logger_1.logger.error('Error processing message status', {
                error: error instanceof Error ? error.message : 'Unknown error',
                body: req.body
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async sendTestMessage(req, res) {
        try {
            const { to, message } = req.body;
            if (!to || !message) {
                res.status(400).json({
                    error: 'Missing parameters: to and message required'
                });
                return;
            }
            logger_1.logger.info('Test message request', { to, message });
            const success = await this.whatsappService.sendTextMessage(to, message);
            if (success) {
                res.status(200).json({
                    status: 'sent',
                    message: 'Message sent successfully'
                });
            }
            else {
                res.status(500).json({
                    error: 'Failed to send message'
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Error sending test message', {
                error: error instanceof Error ? error.message : 'Unknown error',
                body: req.body
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async getConversationStats(req, res) {
        try {
            const stats = {
                totalConversations: 0,
                activeUsers: 0,
                messagesProcessed: 0,
                averageResponseTime: 0,
                aiProvider: 'configured',
                knowledgeBaseEntries: 0,
                lastUpdated: new Date().toISOString()
            };
            res.status(200).json(stats);
        }
        catch (error) {
            logger_1.logger.error('Failed to retrieve conversation stats', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async resetUserConversation(req, res) {
        try {
            const { phoneNumber } = req.body;
            if (!phoneNumber) {
                res.status(400).json({
                    error: 'Phone number is required'
                });
                return;
            }
            await this.conversationService.resetConversation(phoneNumber);
            res.status(200).json({
                status: 'success',
                message: 'Conversation reset successfully'
            });
        }
        catch (error) {
            logger_1.logger.error('Error resetting conversation', {
                error: error instanceof Error ? error.message : 'Unknown error',
                body: req.body
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async getUserContext(req, res) {
        try {
            const { phoneNumber } = req.params;
            if (!phoneNumber) {
                res.status(400).json({
                    error: 'Phone number is required'
                });
                return;
            }
            const context = await this.conversationService.getConversationContext(phoneNumber);
            if (!context) {
                res.status(404).json({
                    error: 'User context not found'
                });
                return;
            }
            const { conversationHistory, ...contextWithoutHistory } = context;
            res.status(200).json({
                ...contextWithoutHistory,
                messageCount: conversationHistory.length,
                lastMessages: conversationHistory.slice(-5)
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting user context', {
                error: error instanceof Error ? error.message : 'Unknown error',
                phoneNumber: req.params.phoneNumber
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
exports.ConversationController = ConversationController;
//# sourceMappingURL=conversationController.js.map