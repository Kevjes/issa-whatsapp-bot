"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuTemplates = void 0;
const systemButtons_1 = require("./systemButtons");
class MenuTemplates {
    static createWelcomeMessage(to, userName) {
        const welcomeText = userName
            ? `Bienvenu _*${userName}*_. \n\nJe suis ISSA, assistant virtuel de chez Royal Onyx. \nLe menu vous permet de naviguer dans toutes les fonctionnalités.`
            : `Bienvenu. \n\nJe suis ISSA, assistant virtuel de chez Royal Onyx. \nLe menu vous permet de naviguer dans toutes les fonctionnalités.`;
        const interactive = {
            type: 'list',
            header: {
                type: 'text',
                text: 'Royal Onyx'
            },
            body: {
                text: welcomeText
            },
            footer: {
                text: 'Important: Utilisez les boutons MENU pour naviguer.'
            },
            action: {
                button: 'MENU',
                sections: this.getMainMenuSections()
            }
        };
        return {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive,
        };
    }
    static createMessageWithMenuButton(to, messageText) {
        const interactive = {
            type: 'button',
            body: {
                text: messageText
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
    static createReturnToMenuButton(to, messageText) {
        const interactive = {
            type: 'button',
            body: {
                text: messageText
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
    static getMainMenuSections() {
        return [
            {
                title: 'MENU',
                rows: [
                    {
                        id: 'contact_us',
                        title: '💬 Contactez-nous',
                    },
                    {
                        id: 'about',
                        title: '🏛️ A propos',
                    },
                    {
                        id: 'where',
                        title: '📍 Où sommes-nous',
                    },
                    {
                        id: 'working_hours',
                        title: '🕒 Heures d\'ouverture',
                    }
                ]
            },
        ];
    }
    static getInfoMessages() {
        return {
            contact_us: '💬 Contactez-nous selectionné avec succès.\n\nVous pouvez nous contacter via:\n- Phone: +237 690 00 00 00\n- Email: contact@issa-takaful.com\n- Address: Yaoundé, Cameroon',
            about: '🏛️ A propos selectionné avec succès.\n\nJe suis ISSA, assistant virtuel de chez Royal Onyx. \nJe suis ici pour vous aider a en savoir plus sur Royal Onyx et sur le projet Takaful.',
            where: '💬 _Where_ selectionné avec succès.\n\nRoyal Onyx est une entreprise de assurance vie et assurance maladie qui a pour mission de protéger les personnes et les familles contre les risques de la vie et de la santé.\nNous sommes situés à Yaoundé, Cameroon.',
            working_hours: '💬 _Working Hours_ selectionné avec succès.\n\nNous sommes ouverts du lundi au vendredi de 8h00 à 17h00. et le samedi de 9h00 à 14h00.',
        };
    }
}
exports.MenuTemplates = MenuTemplates;
//# sourceMappingURL=menu.js.map