import { WhatsAppOutgoingMessage, WhatsAppInteractive, WhatsAppImageMedia } from '../types';
import { SystemButtonTemplates } from './systemButtons';

/**
 * Templates pour les menus WhatsApp
 */
export class MenuTemplates {
  
  /**
   * Message de bienvenue avec menu principal
   */
  static createWelcomeMessage(to: string, userName?: string): WhatsAppOutgoingMessage {
    const welcomeText = userName 
      ? `Bienvenu _*${userName}*_. \n\nJe suis ISSA, assistant virtuel de chez Royal Onyx. \nLe menu vous permet de naviguer dans toutes les fonctionnalités.`
      : `Bienvenu. \n\nJe suis ISSA, assistant virtuel de chez Royal Onyx. \nLe menu vous permet de naviguer dans toutes les fonctionnalités.`;

    const interactive: WhatsAppInteractive = {
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

  /**
   * Message avec bouton retour au menu
   */
  static createMessageWithMenuButton(to: string, messageText: string): WhatsAppOutgoingMessage {
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: messageText
      },
      action: {
        buttons: [SystemButtonTemplates.whatsappMenuButton()]
      }
    };

    return {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive
    };
  }

  /**
   * Message avec bouton retour au menu
   */
  static createReturnToMenuButton(to: string, messageText: string): WhatsAppOutgoingMessage {
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: messageText
      },
      action: {
        buttons: [SystemButtonTemplates.whatsappMenuButton()]
      }
    };

    return {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive
    };
  }

  /**
   * Sections du menu principal
   */
  private static getMainMenuSections() {
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

  /**
   * Messages d'information statiques
   */
  static getInfoMessages() {
    return {
      contact_us: '💬 Contactez-nous selectionné avec succès.\n\nVous pouvez nous contacter via:\n- Phone: +237 690 00 00 00\n- Email: contact@issa-takaful.com\n- Address: Yaoundé, Cameroon',
      about: '🏛️ A propos selectionné avec succès.\n\nJe suis ISSA, assistant virtuel de chez Royal Onyx. \nJe suis ici pour vous aider a en savoir plus sur Royal Onyx et sur le projet Takaful.',
      where: '💬 _Where_ selectionné avec succès.\n\nRoyal Onyx est une entreprise de assurance vie et assurance maladie qui a pour mission de protéger les personnes et les familles contre les risques de la vie et de la santé.\nNous sommes situés à Yaoundé, Cameroon.',
      working_hours: '💬 _Working Hours_ selectionné avec succès.\n\nNous sommes ouverts du lundi au vendredi de 8h00 à 17h00. et le samedi de 9h00 à 14h00.',
   };
  }
}