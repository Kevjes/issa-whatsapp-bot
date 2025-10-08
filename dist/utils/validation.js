"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInitWord = exports.isInitializationWord = exports.validateWebhookSignature = exports.formatResponseForWhatsApp = exports.sanitizeTextForAI = exports.extractInteractiveFromIncomingMessage = exports.extractInteractiveFromWhatsAppMessage = exports.extractTextFromWhatsAppMessage = exports.validateTextMessage = exports.validatePhoneNumber = exports.whatsappMessageSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const phoneUtils_1 = require("./phoneUtils");
exports.whatsappMessageSchema = joi_1.default.object({
    object: joi_1.default.string().valid('whatsapp_business_account').required(),
    entry: joi_1.default.array().items(joi_1.default.object({
        id: joi_1.default.string().required(),
        changes: joi_1.default.array().items(joi_1.default.object({
            value: joi_1.default.object({
                messaging_product: joi_1.default.string().valid('whatsapp').required(),
                metadata: joi_1.default.object({
                    display_phone_number: joi_1.default.string().required(),
                    phone_number_id: joi_1.default.string().required()
                }).required(),
                contacts: joi_1.default.array().items(joi_1.default.object({
                    profile: joi_1.default.object({
                        name: joi_1.default.string().required()
                    }).required(),
                    wa_id: joi_1.default.string().required()
                })).optional(),
                messages: joi_1.default.array().items(joi_1.default.object({
                    from: joi_1.default.string().required(),
                    id: joi_1.default.string().required(),
                    timestamp: joi_1.default.string().required(),
                    text: joi_1.default.object({
                        body: joi_1.default.string().required()
                    }).optional(),
                    type: joi_1.default.string().valid('text', 'image', 'audio', 'video', 'document', 'interactive').required(),
                    context: joi_1.default.object({
                        from: joi_1.default.string().optional(),
                        id: joi_1.default.string().optional(),
                        referred_product: joi_1.default.object().optional()
                    }).optional(),
                    interactive: joi_1.default.object({
                        type: joi_1.default.string().valid('button_reply', 'list_reply').required(),
                        button_reply: joi_1.default.object({
                            id: joi_1.default.string().required(),
                            title: joi_1.default.string().required()
                        }).when('type', { is: 'button_reply', then: joi_1.default.required(), otherwise: joi_1.default.forbidden() }),
                        list_reply: joi_1.default.object({
                            id: joi_1.default.string().required(),
                            title: joi_1.default.string().required(),
                            description: joi_1.default.string().optional()
                        }).when('type', { is: 'list_reply', then: joi_1.default.required(), otherwise: joi_1.default.forbidden() })
                    }).when('type', { is: 'interactive', then: joi_1.default.required(), otherwise: joi_1.default.forbidden() })
                })).optional(),
                statuses: joi_1.default.array().optional()
            }).required(),
            field: joi_1.default.string().valid('messages').required()
        })).required()
    })).required()
});
const validatePhoneNumber = (phoneNumber) => {
    const phoneRegex = /^\d{10,15}$/;
    return phoneRegex.test(phoneNumber);
};
exports.validatePhoneNumber = validatePhoneNumber;
const validateTextMessage = (message) => {
    if (!message || typeof message !== 'string') {
        return false;
    }
    if (message.length > 4096) {
        return false;
    }
    if (message.trim().length === 0) {
        return false;
    }
    return true;
};
exports.validateTextMessage = validateTextMessage;
const extractTextFromWhatsAppMessage = (whatsappMessage) => {
    try {
        const entry = whatsappMessage.entry[0];
        const change = entry.changes[0];
        const messages = change.value.messages;
        if (!messages || messages.length === 0) {
            return null;
        }
        const message = messages[0];
        if (message.type !== 'text' || !message.text) {
            return null;
        }
        const normalizedFrom = (0, phoneUtils_1.normalizeCameroonianPhoneNumber)(message.from);
        return {
            text: message.text.body,
            from: normalizedFrom,
            messageId: message.id
        };
    }
    catch (error) {
        return null;
    }
};
exports.extractTextFromWhatsAppMessage = extractTextFromWhatsAppMessage;
const extractInteractiveFromWhatsAppMessage = (whatsappMessage) => {
    try {
        const entry = whatsappMessage.entry[0];
        const change = entry.changes[0];
        const messages = change.value.messages;
        if (!messages || messages.length === 0) {
            return null;
        }
        const message = messages[0];
        if (message.type !== 'interactive' || !message.interactive) {
            return null;
        }
        const normalizedFrom = (0, phoneUtils_1.normalizeCameroonianPhoneNumber)(message.from);
        const interactive = message.interactive;
        if (interactive.type === 'button_reply' && interactive.button_reply) {
            return {
                type: 'button_reply',
                id: interactive.button_reply.id,
                title: interactive.button_reply.title,
                from: normalizedFrom,
                messageId: message.id
            };
        }
        if (interactive.type === 'list_reply' && interactive.list_reply) {
            return {
                type: 'list_reply',
                id: interactive.list_reply.id,
                title: interactive.list_reply.title,
                description: interactive.list_reply.description,
                from: normalizedFrom,
                messageId: message.id
            };
        }
        return null;
    }
    catch (error) {
        return null;
    }
};
exports.extractInteractiveFromWhatsAppMessage = extractInteractiveFromWhatsAppMessage;
const extractInteractiveFromIncomingMessage = (message) => {
    try {
        if (message.type !== 'interactive' || !message.interactive) {
            return null;
        }
        const interactive = message.interactive;
        if (interactive.type === 'button_reply' && interactive.button_reply) {
            return {
                type: 'button_reply',
                id: interactive.button_reply.id,
                title: interactive.button_reply.title
            };
        }
        if (interactive.type === 'list_reply' && interactive.list_reply) {
            return {
                type: 'list_reply',
                id: interactive.list_reply.id,
                title: interactive.list_reply.title,
                description: interactive.list_reply.description
            };
        }
        return null;
    }
    catch (error) {
        return null;
    }
};
exports.extractInteractiveFromIncomingMessage = extractInteractiveFromIncomingMessage;
const sanitizeTextForAI = (text) => {
    return text
        .trim()
        .replace(/\s+/g, ' ')
        .substring(0, 1000);
};
exports.sanitizeTextForAI = sanitizeTextForAI;
const formatResponseForWhatsApp = (text) => {
    if (text.length > 4096) {
        return text.substring(0, 4090) + '...';
    }
    return text;
};
exports.formatResponseForWhatsApp = formatResponseForWhatsApp;
const validateWebhookSignature = (payload, signature, secret) => {
    const crypto = require('crypto');
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
    const receivedSignature = signature.replace('sha256=', '');
    const isValid = crypto.timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(receivedSignature, 'hex'));
    return isValid;
};
exports.validateWebhookSignature = validateWebhookSignature;
const isInitializationWord = (text, initWords) => {
    if (!text || typeof text !== 'string') {
        return false;
    }
    const normalizedText = text.trim().toLowerCase();
    return initWords.includes(normalizedText);
};
exports.isInitializationWord = isInitializationWord;
const isInitWord = (text) => {
    const { config } = require('../config');
    return (0, exports.isInitializationWord)(text, config.initWords.words);
};
exports.isInitWord = isInitWord;
//# sourceMappingURL=validation.js.map