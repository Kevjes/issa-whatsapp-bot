"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemButtonTemplates = void 0;
class SystemButtonTemplates {
    static whatsappCancelButton() {
        return {
            type: 'reply',
            reply: {
                id: 'cancel',
                title: 'Cancel'
            }
        };
    }
    static whatsappMenuButton() {
        return {
            type: 'reply',
            reply: {
                id: 'main_menu',
                title: 'MENU'
            }
        };
    }
    static whatsappYesTransferReceiverButton() {
        return {
            type: 'reply',
            reply: {
                id: 'transfer_confirm_receiver',
                title: '✅ YES'
            }
        };
    }
    static whatsappNoTransferReceiverButton() {
        return {
            type: 'reply',
            reply: {
                id: 'transfer_reject_receiver',
                title: '❌ NO'
            }
        };
    }
    static whatsappYesTransferFinalButton() {
        return {
            type: 'reply',
            reply: {
                id: 'transfer_confirm_final',
                title: '✅ YES'
            }
        };
    }
    static whatsappNoTransferFinalButton() {
        return {
            type: 'reply',
            reply: {
                id: 'transfer_cancel',
                title: '❌ NO'
            }
        };
    }
    static whatsappRetryTransferReceiverButton() {
        return {
            type: 'reply',
            reply: {
                id: 'transfer_retry_receiver',
                title: '🔄 RETRY'
            }
        };
    }
    static whatsappCancelTransferButton() {
        return {
            type: 'reply',
            reply: {
                id: 'transfer_cancel',
                title: '❌ Cancel'
            }
        };
    }
}
exports.SystemButtonTemplates = SystemButtonTemplates;
//# sourceMappingURL=systemButtons.js.map