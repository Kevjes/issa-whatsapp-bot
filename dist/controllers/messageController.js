"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageController = exports.MessageController = void 0;
const validation_1 = require("../utils/validation");
const logger_1 = require("../utils/logger");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const Container_1 = require("../core/di/Container");
class MessageController {
    async handleIncomingMessage(req, res) {
        try {
            const whatsappMessage = req.body;
            logger_1.logger.info('Message WhatsApp received', {
                messageData: whatsappMessage
            });
            const messageData = (0, validation_1.extractTextFromWhatsAppMessage)(whatsappMessage);
            if (!messageData) {
                logger_1.logger.info('Message is not text or invalid ignored');
                res.status(200).json({ status: 'ignored' });
                return;
            }
            const { text, from, messageId } = messageData;
            logger_1.logger.info('Message text extracted', {
                from,
                messageId,
                textLength: text.length
            });
            const rateLimitResult = rateLimiter_1.userRateLimiter.check(from);
            if (!rateLimitResult.allowed) {
                logger_1.logger.warn('Rate limit exceeded for user', {
                    from,
                    resetTime: rateLimitResult.resetTime
                });
                const whatsappService = await Container_1.container.resolve(Container_1.TOKENS.WHATSAPP_SERVICE);
                await whatsappService.sendErrorMessage(from, 'rate_limit');
                res.status(200).json({ status: 'rate_limited' });
                return;
            }
            const whatsappService = await Container_1.container.resolve(Container_1.TOKENS.WHATSAPP_SERVICE);
            await whatsappService.markMessageAsRead(messageId);
            this.processMessageAsync(text, from, messageId);
            res.status(200).json({ status: 'received' });
        }
        catch (error) {
            logger_1.logger.error('Error processing incoming message', {
                error: error.message,
                stack: error.stack,
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
            const whatsappService = await Container_1.container.resolve(Container_1.TOKENS.WHATSAPP_SERVICE);
            const messageSent = await whatsappService.sendTextMessage(from, text);
            if (messageSent) {
                logger_1.logger.info('Response sent successfully', {
                    from,
                    messageId,
                    responseLength: text.length
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
                error: error.message,
                stack: error.stack
            });
            try {
                const whatsappService = await Container_1.container.resolve(Container_1.TOKENS.WHATSAPP_SERVICE);
                await whatsappService.sendErrorMessage(from, 'technical');
            }
            catch (sendError) {
                logger_1.logger.error('Failed to send error message', {
                    from,
                    sendError: sendError.message
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
                error: error.message,
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
            logger_1.logger.info('Test message sent', { to, message });
            const whatsappService = await Container_1.container.resolve(Container_1.TOKENS.WHATSAPP_SERVICE);
            const success = await whatsappService.sendTextMessage(to, message);
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
                error: error.message,
                body: req.body
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async getMessageStats(req, res) {
        try {
            const stats = {
                totalMessages: 0,
                successfulResponses: 0,
                errors: 0,
                averageResponseTime: 0,
                lastUpdated: new Date().toISOString()
            };
            res.status(200).json(stats);
        }
        catch (error) {
            logger_1.logger.error('Failed to retrieve message stats', {
                error: error.message
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
exports.MessageController = MessageController;
exports.messageController = new MessageController();
//# sourceMappingURL=messageController.js.map