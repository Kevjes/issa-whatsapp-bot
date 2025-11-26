"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuService = void 0;
const templates_1 = require("../templates");
class MenuService {
    constructor(whatsappService) {
        this.whatsappService = whatsappService;
    }
    async createWelcomeMessage(to, userName) {
        return templates_1.MenuTemplates.createWelcomeMessage(to, userName);
    }
    async processMenuSelection(optionId, to) {
        let responseText;
        switch (optionId) {
            case 'contact_us':
            case 'about':
            case 'where':
            case 'working_hours':
                const infoMessages = templates_1.MenuTemplates.getInfoMessages();
                responseText = infoMessages[optionId] || 'Information not available.';
                break;
            default:
                return templates_1.ErrorTemplates.createUnknownOptionMessage(to);
        }
        return templates_1.MenuTemplates.createMessageWithMenuButton(to, responseText);
    }
    createErrorMessage(to, errorMessage) {
        return templates_1.ErrorTemplates.createGenericErrorMessage(to, errorMessage);
    }
    extractUserName(contacts) {
        if (contacts && contacts.length > 0) {
            return contacts[0].profile?.name;
        }
        return undefined;
    }
}
exports.MenuService = MenuService;
//# sourceMappingURL=menuService.js.map