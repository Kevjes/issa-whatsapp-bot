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
        title: 'Operations',
        rows: [
          {
            id: 'account_balance',
            title: '💰 Account Balance',
          },
          {
            id: 'mini_statement',
            title: '📄 Mini Statement',
          },
          {
            id: 'contact_us',
            title: '💬 Contact Us',
          }
        ]
      },
      {
        title: 'Transfers',
        rows: [
          {
            id: 'intra_bank',
            title: '🏦 Intra-Bank',
          },
          {
            id: 'inter_bank',
            title: '🏛️ Inter-Bank',
            description: 'Coming Soon 😊'
          }
        ]
      },
      {
        title: 'Information about us',
        rows: [
          {
            id: 'whatsapp_banking',
            title: "💬 What's AFBSS Connect",
          },
          {
            id: 'working_hours',
            title: '🕐 AFBSS Working Hours',
          },
          {
            id: 'pin_info',
            title: '🔒 PIN',
          }
        ]
      },
      {
        title: 'Locations & Services',
        rows: [
          {
            id: 'our_branches',
            title: '🏢 Our Branches',
          },
          {
            id: 'atm_pos_network',
            title: '🏧 ATM and PoS Network',
          }
        ]
      }
    ];
  }

  /**
   * Messages d'information statiques
   */
  static getInfoMessages() {
    return {
      contact_us: '💬 Contact Us has been selected successfully.\n\nYou can contact us via:\n- Phone: +211 922 442 446\n- Email: firstbank@afrilandfirstbankss.com\n- Address: Juba, South Sudan',
      inter_bank: '🏛️ Inter-Bank has been selected successfully.\n\nComing Soon 😊\n\nThis functionality will be available soon for transfers to other banks.',
      whatsapp_banking: '💬 _What is First Bank Connect_ has been selected successfully.\n\nFirst Bank Connect is an innovative service of Afriland First Bank that allows you to perform your banking operations directly via WhatsApp.',
      working_hours: '🕐 AFBSS Working Hours has been selected successfully.\n\nOur opening hours:\n- Monday to Friday: 8h00 AM - 4h00 PM\n- Saturday: 9h00 AM - 4h00 PM\n- Sunday: Closed\n\n✅ Beyond branch hours, our digital services remain open 24/7.',
      pin_info: '🔒 PIN has been selected successfully.\n\nYour PIN is a 6-digit security code necessary to validate your transactions. Keep it confidential.',
      our_branches: '🏢 Our Branches has been selected successfully.\n\nOur branch locations:\n- Hai cinema➡ opposite Juba One boys school.\n- Airport Road Branch\n- Konyokonyo ➡ Marahba Road\n- Gudele 1 ➡ Next to Antipas\n- Gudele ll ➡ Zain compound\n- University of Juba ➡ clock Tower\n- Sherikat ➡ Nile pet station\n- Nimule➡ Custom compound\n- Airport branch➡ Aviation Center',
      atm_pos_network: '🏧 ATM and PoS Network has been selected successfully.\n\nOur ATM and PoS locations:\n- Hai Cinema Branch\n- Airport Road Branch\n- Konyokonyo Branch\n- Sherikat Branch\n- Gabat\n- Imperial plaza\n- Noble Bistros'
    };
  }
}