"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validation_1 = require("../middlewares/validation");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const logger_1 = require("../utils/logger");
const core_1 = require("../core");
const router = (0, express_1.Router)();
router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
        logger_1.logger.info('Webhook vérifié avec succès');
        res.status(200).send(challenge);
    }
    else {
        logger_1.logger.error('Webhook verification failed', {
            mode,
            token,
            expectedToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
        });
        res.status(403).send('Forbidden');
    }
});
router.post('/', rateLimiter_1.webhookRateLimit, validation_1.validateHeaders, validation_1.validateWhatsAppWebhook, async (req, res) => {
    try {
        const whatsappMessage = req.body;
        const entry = whatsappMessage.entry[0];
        const change = entry.changes[0];
        const value = change.value;
        if (value.messages && value.messages.length > 0) {
            const message = value.messages[0];
            const phoneNumber = message.from;
            logger_1.logger.logWhatsAppMessage('incoming', phoneNumber, message);
            const conversationController = await core_1.container.resolve(core_1.TOKENS.CONVERSATION_CONTROLLER);
            await conversationController.handleIncomingMessage(req, res);
            return;
        }
        if (value.statuses && value.statuses.length > 0) {
            const conversationController = await core_1.container.resolve(core_1.TOKENS.CONVERSATION_CONTROLLER);
            await conversationController.handleMessageStatus(req, res);
            return;
        }
        res.status(200).json({ status: 'received' });
    }
    catch (error) {
        logger_1.logger.error('Webhook processing error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/health', async (req, res) => {
    try {
        logger_1.logger.info('Health check webhook requested');
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            webhook: 'whatsapp',
            version: '1.0.0'
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_1.logger.error('Health check webhook failed', {
            error: errorMessage
        });
        res.status(500).json({
            status: 'unhealthy',
            error: errorMessage
        });
    }
});
if (process.env.NODE_ENV === 'development') {
    router.post('/test', async (req, res) => {
        try {
            const { phoneNumber, message } = req.body;
            if (!phoneNumber || !message) {
                res.status(400).json({
                    error: 'phoneNumber and message are required'
                });
                return;
            }
            const simulatedMessage = {
                object: 'whatsapp_business_account',
                entry: [{
                        id: 'test-entry-id',
                        changes: [{
                                value: {
                                    messaging_product: 'whatsapp',
                                    metadata: {
                                        display_phone_number: '1234567890',
                                        phone_number_id: 'test-phone-id'
                                    },
                                    contacts: [{
                                            profile: {
                                                name: 'Test User'
                                            },
                                            wa_id: phoneNumber
                                        }],
                                    messages: [{
                                            from: phoneNumber,
                                            id: `test-msg-${Date.now()}`,
                                            timestamp: Date.now().toString(),
                                            text: {
                                                body: message
                                            },
                                            type: 'text'
                                        }]
                                },
                                field: 'messages'
                            }]
                    }]
            };
            req.body = simulatedMessage;
            const conversationController = await core_1.container.resolve(core_1.TOKENS.CONVERSATION_CONTROLLER);
            await conversationController.handleIncomingMessage(req, res);
        }
        catch (error) {
            logger_1.logger.error('Test webhook failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                body: req.body
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    });
}
exports.default = router;
//# sourceMappingURL=whatsappWebhook.js.map