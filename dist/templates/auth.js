"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthTemplates = void 0;
const systemButtons_1 = require("./systemButtons");
class AuthTemplates {
    static createPinRequestMessage(to, actionName, pinLink) {
        const interactive = {
            type: 'button',
            body: {
                text: `🔐 ${actionName}\n\nPlease enter your PIN.\n\nClick on the link below to enter your PIN securely:\n\n${pinLink}\n\n⚠️ This link expires in 5 minutes for your security.`
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
    static createAuthErrorMessage(to, errorMessage) {
        return {
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: {
                body: `❌ *Authentication error*\n\n${errorMessage}\n\nPlease verify your PIN and try again.`
            }
        };
    }
    static createSessionExpiredMessage(to) {
        const interactive = {
            type: 'button',
            body: {
                text: '⏰ *Session expired*\n\nYour session has expired for security reasons. Please restart from the main menu.'
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
    static createInvalidPinMessage(to) {
        const interactive = {
            type: 'button',
            body: {
                text: '❌ *Invalid PIN*\n\nThe PIN must contain 4 to 6 digits. Please try again.'
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
    static createPinValidationSuccessMessage() {
        return {
            success: true,
            message: 'PIN validated successfully. Please check your WhatsApp for the next steps.'
        };
    }
    static createPinProcessingErrorMessage() {
        return {
            success: false,
            message: 'Error processing PIN. Please try again.'
        };
    }
    static createInvalidSessionMessage() {
        return {
            success: false,
            message: 'Session expired or invalid. Please restart from WhatsApp.'
        };
    }
    static createInvalidPinApiMessage() {
        return {
            success: false,
            message: 'Invalid PIN. The PIN must contain 4 to 6 digits.'
        };
    }
    static createNewPinRequestMessage(to, pinLink) {
        const interactive = {
            type: 'button',
            body: {
                text: `🔐 *Change PIN*\n\nYour current PIN has been validated.\n\nNow please enter your new PIN.\n\nClick on the link below to enter your new PIN securely:\n\n${pinLink}\n\n⚠️ This link expires in 10 minutes for your security.`
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
    static createSamePinErrorMessage(to) {
        const interactive = {
            type: 'button',
            body: {
                text: '❌ *Same PIN Error*\n\nYour new PIN must be different from your current PIN. Please choose a different PIN.'
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
    static createPinChangeSuccessMessage(to) {
        const interactive = {
            type: 'button',
            body: {
                text: '✅ *PIN Changed Successfully*\n\nYour PIN has been changed successfully. Please use your new PIN for future transactions.\n\n⚠️ Keep your new PIN confidential and secure.'
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
    static createPinChangeErrorMessage(to, errorMessage) {
        const interactive = {
            type: 'button',
            body: {
                text: `❌ *PIN Change Failed*\n\n${errorMessage}\n\nPlease try again or contact customer service if the problem persists.`
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
exports.AuthTemplates = AuthTemplates;
//# sourceMappingURL=auth.js.map