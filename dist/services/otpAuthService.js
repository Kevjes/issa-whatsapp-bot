"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpAuthService = void 0;
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const axios_1 = __importDefault(require("axios"));
class OtpAuthService {
    constructor(authService) {
        this.baseUrl = config_1.config.banking.apiUrl;
        this.authService = authService;
    }
    async sendOtp(phoneNumber) {
        try {
            if (!this.authService) {
                return {
                    success: false,
                    message: 'Service d\'authentification non disponible'
                };
            }
            const token = await this.authService.getValidToken();
            const response = await axios_1.default.get(`${this.baseUrl}/whatsapp/login/${phoneNumber}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Auth-Token': token
                },
                timeout: 30000
            });
            logger_1.logger.info('OTP sent successfully', {
                phoneNumber,
                status: response.status
            });
            return {
                success: true,
                message: 'OTP sent successfully'
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to send OTP', {
                phoneNumber,
                error: error.response?.data || error.message
            });
            return {
                success: false,
                message: 'Failed to send OTP. Please try again.'
            };
        }
    }
    async validateOtp(phoneNumber, otp) {
        try {
            logger_1.logger.info('Validating OTP', { phoneNumber, otp: '***' });
            if (!this.authService) {
                return {
                    success: false,
                    message: 'Service d\'authentification non disponible'
                };
            }
            const token = await this.authService.getValidToken();
            const response = await axios_1.default.get(`${this.baseUrl}/whatsapp/v3/validate/login/${phoneNumber}/${otp}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Auth-Token': token
                },
                timeout: 30000
            });
            if (response.status === 200) {
                logger_1.logger.info('OTP validated successfully', {
                    phoneNumber,
                    status: response.status
                });
                return {
                    success: true,
                    message: 'OTP validated successfully',
                    accounts: response.data?.returnValue || []
                };
            }
            else {
                logger_1.logger.warn('OTP validation failed', {
                    phoneNumber,
                    status: response.status
                });
                return {
                    success: false,
                    message: 'Invalid OTP. Please try again.'
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to validate OTP', {
                phoneNumber,
                error: error.response?.data || error.message,
                status: error.response?.status
            });
            if (error.response?.status && error.response.status !== 200) {
                return {
                    success: false,
                    message: 'Invalid OTP. Please try again.'
                };
            }
            return {
                success: false,
                message: 'Technical error during OTP validation. Please try again.'
            };
        }
    }
    isValidOtpFormat(otp) {
        const otpRegex = /^\d{4,6}$/;
        return otpRegex.test(otp);
    }
}
exports.OtpAuthService = OtpAuthService;
//# sourceMappingURL=otpAuthService.js.map