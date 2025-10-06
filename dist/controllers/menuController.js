"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuController = void 0;
const validation_1 = require("../utils/validation");
const logger_1 = require("../utils/logger");
class MenuController {
    constructor(whatsappService, menuService) {
        this.whatsappService = whatsappService;
        this.menuService = menuService;
    }
    async handleIncomingMessage(req, res) {
        try {
            logger_1.logger.debug('Webhook received', {
                method: req.method,
                hasMessages: !!req.body?.entry?.[0]?.changes?.[0]?.value?.messages
            });
            if (req.body?.entry?.[0]?.changes?.[0]?.value?.messages) {
                const messages = req.body.entry[0].changes[0].value.messages;
                const contacts = req.body.entry[0].changes[0].value.contacts || [];
                for (const message of messages) {
                    await this.processMessage(message, contacts);
                }
            }
            res.status(200).json({ status: 'success' });
        }
        catch (error) {
            logger_1.logger.error('Error processing webhook', {
                error: error.message,
                stack: error.stack
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async processMessage(message, contacts) {
        try {
            const phoneNumber = message.from;
            const userName = this.menuService.extractUserName(contacts) || 'User';
            logger_1.logger.info('Message received', {
                from: phoneNumber,
                type: message.type
            });
            if (message.type === 'interactive') {
                await this.handleInteractiveMessage(message, phoneNumber, userName);
            }
            else {
                await this.sendWelcomeMessage(phoneNumber, userName);
            }
        }
        catch (error) {
            logger_1.logger.error('Error processing message', {
                messageId: message.id,
                from: message.from,
                error: error.message
            });
        }
    }
    async handleInteractiveMessage(message, phoneNumber, userName) {
        try {
            const interactiveData = (0, validation_1.extractInteractiveFromIncomingMessage)(message);
            if (!interactiveData) {
                logger_1.logger.warn('Interactive data not found', { phoneNumber });
                await this.sendWelcomeMessage(phoneNumber, userName);
                return;
            }
            logger_1.logger.info('Option selected', { phoneNumber, optionId: interactiveData.id, title: interactiveData.title });
            if (interactiveData.id === 'main_menu' ||
                interactiveData.id === 'return_to_menu' ||
                interactiveData.title.toUpperCase().includes('MENU')) {
                const menuMessage = await this.menuService.createWelcomeMessage(phoneNumber);
                await this.whatsappService.sendMessage(menuMessage);
                logger_1.logger.info('Main menu sent following MENU selection', { phoneNumber, trigger: interactiveData.title });
                return;
            }
            const responseMessage = await this.menuService.processMenuSelection(interactiveData.id, phoneNumber);
            if (responseMessage) {
                await this.whatsappService.sendMessage(responseMessage);
            }
        }
        catch (error) {
            logger_1.logger.error('Error processing interactive message', {
                phoneNumber,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            const errorMessage = this.menuService.createErrorMessage(phoneNumber, 'Error processing interactive message');
            await this.whatsappService.sendMessage(errorMessage);
        }
    }
    async sendWelcomeMessage(phoneNumber, userName) {
        try {
            const welcomeMessage = await this.menuService.createWelcomeMessage(phoneNumber, userName);
            const success = await this.whatsappService.sendMessage(welcomeMessage);
            if (success) {
                logger_1.logger.info('Welcome message sent', {
                    to: phoneNumber
                });
            }
            else {
                logger_1.logger.error('Failed to send welcome message', {
                    to: phoneNumber
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Error sending welcome message', {
                to: phoneNumber,
                userName: userName,
                error: error.message
            });
        }
    }
    verifyWebhook(req, res) {
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
    }
}
exports.MenuController = MenuController;
//# sourceMappingURL=menuController.js.map