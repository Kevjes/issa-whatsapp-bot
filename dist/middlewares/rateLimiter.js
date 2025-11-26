"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRateLimiter = exports.adminRateLimit = exports.aiRateLimit = exports.webhookRateLimit = exports.generalRateLimit = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
exports.generalRateLimit = (0, express_rate_limit_1.default)({
    windowMs: config_1.config.rateLimit.windowMs,
    max: config_1.config.rateLimit.maxRequests,
    message: {
        error: 'Too many requests, please try again later.',
        retryAfter: Math.ceil(config_1.config.rateLimit.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger_1.logger.warn('Rate limit exceeded', {
            ip: req.ip,
            url: req.url,
            userAgent: req.get('User-Agent')
        });
        res.status(429).json({
            error: 'Too many requests, please try again later.',
            retryAfter: Math.ceil(config_1.config.rateLimit.windowMs / 1000)
        });
    },
    skip: (req) => {
        return req.url === '/health' || req.url === '/ping';
    }
});
exports.webhookRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 50,
    message: {
        error: 'Too many messages received, slow down.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const phoneNumber = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
        return phoneNumber ? `${req.ip}-${phoneNumber}` : req.ip || 'unknown';
    },
    handler: (req, res) => {
        const phoneNumber = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
        logger_1.logger.warn('Rate limit webhook exceeded', {
            ip: req.ip,
            phoneNumber,
            url: req.url
        });
        res.status(429).json({
            error: 'Too many messages received, slow down.'
        });
    }
});
exports.aiRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 10,
    message: {
        error: 'You are using our AI assistant too frequently. Please wait.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const phoneNumber = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
        return phoneNumber || req.ip || 'unknown';
    },
    handler: (req, res) => {
        const phoneNumber = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
        logger_1.logger.warn('Rate limit IA exceeded', {
            ip: req.ip,
            phoneNumber
        });
        if (phoneNumber) {
        }
        res.status(429).json({
            error: 'Rate limit IA exceeded'
        });
    }
});
exports.adminRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {
        error: 'Too many admin requests, please try again later.',
        retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger_1.logger.warn('Rate limit admin exceeded', {
            ip: req.ip,
            url: req.url,
            userAgent: req.get('User-Agent')
        });
        res.status(429).json({
            error: 'Too many admin requests, please try again later.'
        });
    }
});
class UserRateLimiter {
    constructor(maxRequests = 5, windowMs = 60000) {
        this.userLimits = new Map();
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
    check(userId) {
        const now = Date.now();
        const userLimit = this.userLimits.get(userId);
        if (!userLimit || now > userLimit.resetTime) {
            this.userLimits.set(userId, {
                count: 1,
                resetTime: now + this.windowMs
            });
            return { allowed: true };
        }
        if (userLimit.count >= this.maxRequests) {
            return {
                allowed: false,
                resetTime: userLimit.resetTime
            };
        }
        userLimit.count++;
        return { allowed: true };
    }
    cleanup() {
        const now = Date.now();
        for (const [userId, limit] of this.userLimits.entries()) {
            if (now > limit.resetTime) {
                this.userLimits.delete(userId);
            }
        }
    }
}
exports.userRateLimiter = new UserRateLimiter(5, 60000);
//# sourceMappingURL=rateLimiter.js.map