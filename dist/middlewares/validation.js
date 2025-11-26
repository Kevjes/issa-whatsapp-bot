"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiError = exports.validateHeaders = exports.requestLogger = exports.errorHandler = exports.validateWebhookVerification = exports.validateWhatsAppWebhook = void 0;
const validation_1 = require("../utils/validation");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const validateWhatsAppWebhook = (req, res, next) => {
    try {
        const signature = req.get('X-Hub-Signature-256');
        if (signature) {
            let payload;
            if ('rawBody' in req && req.rawBody) {
                payload = req.rawBody.toString('utf8');
            }
            else {
                payload = JSON.stringify(req.body);
            }
            logger_1.logger.debug('Validation of webhook signature', {
                payloadLength: payload.length
            });
            const isValidSignature = (0, validation_1.validateWebhookSignature)(payload, signature, config_1.config.whatsapp.appSecret);
            if (!isValidSignature) {
                logger_1.logger.warn('Invalid webhook signature', {
                    ip: req.ip
                });
                res.status(401).json({ error: 'Invalid webhook signature' });
                return;
            }
        }
        const { error, value } = validation_1.whatsappMessageSchema.validate(req.body);
        if (error) {
            logger_1.logger.warn('Invalid WhatsApp message structure', {
                errorCount: error.details.length,
                firstError: error.details[0]?.message
            });
            res.status(400).json({
                error: 'Invalid WhatsApp message structure',
                details: error.details
            });
            return;
        }
        req.body = value;
        next();
    }
    catch (error) {
        logger_1.logger.error('Error validating webhook', {
            error: error instanceof Error ? error.message : 'Unknown error',
            body: req.body
        });
        res.status(500).json({ error: 'Error validating webhook' });
    }
};
exports.validateWhatsAppWebhook = validateWhatsAppWebhook;
const validateWebhookVerification = (req, res, _next) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === config_1.config.whatsapp.webhookVerifyToken) {
        res.status(200).send(challenge);
        return;
    }
    logger_1.logger.warn('Webhook verification failed', {
        mode,
        token,
        expectedToken: config_1.config.whatsapp.webhookVerifyToken
    });
    res.status(403).json({ error: 'Invalid webhook verification token' });
};
exports.validateWebhookVerification = validateWebhookVerification;
const errorHandler = (error, req, res, _next) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger_1.logger.error('API error', {
        error: errorMessage,
        stack: errorStack,
        url: req.url,
        method: req.method,
        body: req.body
    });
    if (error && typeof error === 'object' && 'statusCode' in error) {
        const customError = error;
        res.status(customError.statusCode).json({
            error: customError.message,
            code: customError.code || 'UNKNOWN_ERROR'
        });
        return;
    }
    if (error && typeof error === 'object' && 'isJoi' in error && 'details' in error) {
        const joiError = error;
        res.status(400).json({
            error: 'Invalid data',
            details: joiError.details
        });
        return;
    }
    res.status(500).json({
        error: 'Internal server error'
    });
};
exports.errorHandler = errorHandler;
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (req.url.trim() !== '/webhook' && req.url.trim() !== '/') {
            logger_1.logger.info('HTTP request', {
                method: req.method,
                url: req.url,
                status: res.statusCode,
                duration: `${duration}ms`,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
        }
    });
    next();
};
exports.requestLogger = requestLogger;
const validateHeaders = (req, res, next) => {
    const contentType = req.get('Content-Type');
    if (req.method === 'POST' && !contentType?.includes('application/json')) {
        res.status(400).json({
            error: 'Content-Type must be application/json'
        });
        return;
    }
    next();
};
exports.validateHeaders = validateHeaders;
const createApiError = (message, statusCode, code) => {
    return {
        message,
        statusCode,
        code: code || 'API_ERROR'
    };
};
exports.createApiError = createApiError;
//# sourceMappingURL=validation.js.map