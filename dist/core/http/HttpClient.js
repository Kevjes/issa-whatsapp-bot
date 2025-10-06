"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClient = void 0;
const axios_1 = __importDefault(require("axios"));
const https_1 = __importDefault(require("https"));
const logger_1 = require("../../utils/logger");
class HttpClient {
    constructor(baseURL, timeout = 30000, ignoreSslErrors = false) {
        this.defaultHeaders = {};
        const axiosConfig = {
            baseURL,
            timeout,
        };
        if (ignoreSslErrors || process.env.NODE_ENV === 'development') {
            axiosConfig.httpsAgent = new https_1.default.Agent({
                rejectUnauthorized: false
            });
        }
        this.axiosInstance = axios_1.default.create(axiosConfig);
        this.setupInterceptors();
    }
    setDefaultHeaders(headers) {
        this.defaultHeaders = { ...this.defaultHeaders, ...headers };
    }
    setDefaultHeader(key, value) {
        this.defaultHeaders[key] = value;
    }
    removeDefaultHeader(key) {
        delete this.defaultHeaders[key];
    }
    setupInterceptors() {
        this.axiosInstance.interceptors.request.use(async (config) => {
            const resolvedHeaders = {};
            for (const [key, value] of Object.entries(this.defaultHeaders)) {
                if (typeof value === 'function') {
                    try {
                        resolvedHeaders[key] = await value();
                    }
                    catch (error) {
                        logger_1.logger.warn(`Error resolving header ${key}`, { error });
                    }
                }
                else {
                    resolvedHeaders[key] = value;
                }
            }
            Object.assign(config.headers, resolvedHeaders);
            logger_1.logger.debug('HTTP request sent', {
                method: config.method?.toUpperCase(),
                url: config.url,
                baseURL: config.baseURL,
                headers: this.sanitizeHeaders(config.headers),
            });
            return config;
        }, (error) => {
            logger_1.logger.error('Error in request interceptor', { error });
            return Promise.reject(error);
        });
        this.axiosInstance.interceptors.response.use((response) => {
            logger_1.logger.debug('HTTP response received', {
                status: response.status,
                statusText: response.statusText,
                url: response.config.url,
            });
            return response;
        }, (error) => {
            const httpError = {
                name: 'HttpError',
                message: error.message || 'HTTP request failed',
                status: error.response?.status,
                response: error.response ? {
                    data: error.response.data,
                    status: error.response.status,
                    statusText: error.response.statusText,
                } : undefined,
            };
            logger_1.logger.error('HTTP error', {
                status: httpError.status,
                message: httpError.message,
                response: httpError.response,
                url: error.config?.url
            });
            return Promise.reject(httpError);
        });
    }
    sanitizeHeaders(headers) {
        const sanitized = {};
        const sensitiveKeys = ['authorization', 'x-auth-token', 'cookie', 'x-api-key'];
        for (const [key, value] of Object.entries(headers || {})) {
            if (sensitiveKeys.includes(key.toLowerCase())) {
                sanitized[key] = '[REDACTED]';
            }
            else {
                sanitized[key] = String(value);
            }
        }
        return sanitized;
    }
    convertResponse(axiosResponse) {
        return {
            data: axiosResponse.data,
            status: axiosResponse.status,
            statusText: axiosResponse.statusText,
            headers: axiosResponse.headers,
        };
    }
    convertConfig(config) {
        if (!config)
            return {};
        return {
            headers: config.headers,
            timeout: config.timeout,
            params: config.params,
        };
    }
    async get(url, config) {
        const response = await this.axiosInstance.get(url, this.convertConfig(config));
        return this.convertResponse(response);
    }
    async post(url, data, config) {
        const response = await this.axiosInstance.post(url, data, this.convertConfig(config));
        return this.convertResponse(response);
    }
    async put(url, data, config) {
        const response = await this.axiosInstance.put(url, data, this.convertConfig(config));
        return this.convertResponse(response);
    }
    async delete(url, config) {
        const response = await this.axiosInstance.delete(url, this.convertConfig(config));
        return this.convertResponse(response);
    }
}
exports.HttpClient = HttpClient;
//# sourceMappingURL=HttpClient.js.map