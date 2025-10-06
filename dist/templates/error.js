"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorTemplates = void 0;
const systemButtons_1 = require("./systemButtons");
class ErrorTemplates {
    static createGenericErrorMessage(to, errorMessage) {
        const interactive = {
            type: 'button',
            body: {
                text: `❌ ${errorMessage}\n\nPlease use the menu to navigate.`
            },
            action: {
                buttons: [systemButtons_1.SystemButtonTemplates.whatsappMenuButton()]
            }
        };
        return {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive
        };
    }
    static createTechnicalErrorMessage(to) {
        const interactive = {
            type: 'button',
            body: {
                text: '❌ *Technical error*\n\nAn error occurred while processing your request. Please try again later.'
            },
            action: {
                buttons: [systemButtons_1.SystemButtonTemplates.whatsappMenuButton()]
            }
        };
        return {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive
        };
    }
    static createUnknownOptionMessage(to) {
        const interactive = {
            type: 'button',
            body: {
                text: '❓ *Unknown option*\n\nPlease use the menu to select a valid option.'
            },
            action: {
                buttons: [systemButtons_1.SystemButtonTemplates.whatsappMenuButton()]
            }
        };
        return {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive
        };
    }
    static createAccountSelectionErrorMessage(to) {
        const interactive = {
            type: 'button',
            body: {
                text: '❌ *Account selection error*\n\nError occurred while selecting the account. Please try again.'
            },
            action: {
                buttons: [systemButtons_1.SystemButtonTemplates.whatsappMenuButton()]
            }
        };
        return {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive
        };
    }
    static createSessionCreationErrorMessage(to) {
        const interactive = {
            type: 'button',
            body: {
                text: '❌ *Session creation error*\n\nError occurred while creating the session. Please try again.'
            },
            action: {
                buttons: [systemButtons_1.SystemButtonTemplates.whatsappMenuButton()]
            }
        };
        return {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive
        };
    }
    static createApiConnectionErrorMessage(to) {
        const interactive = {
            type: 'button',
            body: {
                text: '🔌 *Api connection error*\n\nUnable to connect to the banking service. Please try again in a few minutes.'
            },
            action: {
                buttons: [systemButtons_1.SystemButtonTemplates.whatsappMenuButton()]
            }
        };
        return {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive
        };
    }
    static createTimeoutErrorMessage(to) {
        const interactive = {
            type: 'button',
            body: {
                text: '⏱️ *Timeout error*\n\nThe request took too long. Please try again.'
            },
            action: {
                buttons: [systemButtons_1.SystemButtonTemplates.whatsappMenuButton()]
            }
        };
        return {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive
        };
    }
    static createValidationErrorMessage(to, field) {
        const interactive = {
            type: 'button',
            body: {
                text: `⚠️ *Validation error*\n\nThe field "${field}" is not valid. Please verify and try again.`
            },
            action: {
                buttons: [systemButtons_1.SystemButtonTemplates.whatsappMenuButton()]
            }
        };
        return {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive
        };
    }
    static createServiceUnavailableMessage(to) {
        const interactive = {
            type: 'button',
            body: {
                text: '🚫 *Service temporarily unavailable*\n\nThe banking services are temporarily unavailable. Please try again later.\n\nFor immediate assistance, contact our customer service.'
            },
            action: {
                buttons: [
                    {
                        type: 'reply',
                        reply: {
                            id: 'contact_us',
                            title: '💬 CONTACT'
                        }
                    }
                ]
            }
        };
        return {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive
        };
    }
    static createInvalidFormatMessage(to, message) {
        const interactive = {
            type: 'button',
            body: {
                text: `⚠️ *Invalid format*\n\n${message}`
            },
            action: {
                buttons: [systemButtons_1.SystemButtonTemplates.whatsappMenuButton()]
            }
        };
        return {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive
        };
    }
    static createSessionExpiredMessage(to) {
        const interactive = {
            type: 'button',
            body: {
                text: '⏰ *Session expired*\n\nYour session has expired. Please restart your operation.'
            },
            action: {
                buttons: [systemButtons_1.SystemButtonTemplates.whatsappMenuButton()]
            }
        };
        return {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive
        };
    }
    static createInvalidOtpMessage(to) {
        const interactive = {
            type: 'button',
            body: {
                text: '🔐 *Invalid verification code*\n\nThe verification code you entered is incorrect or has expired.\n\nFor security reasons, your transfer has been cancelled. Please restart the process from the main menu.'
            },
            action: {
                buttons: [systemButtons_1.SystemButtonTemplates.whatsappMenuButton()]
            }
        };
        return {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive
        };
    }
}
exports.ErrorTemplates = ErrorTemplates;
//# sourceMappingURL=error.js.map