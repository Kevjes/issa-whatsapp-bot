import { WhatsAppOutgoingMessage, WhatsAppInteractive } from '../types';
import { SystemButtonTemplates } from './systemButtons';

/**
 * Templates pour les messages d'erreur
 */
export class ErrorTemplates {
  
  /**
   * Message d'erreur générique avec bouton menu
   */
  static createGenericErrorMessage(to: string, errorMessage: string): WhatsAppOutgoingMessage {
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: `❌ ${errorMessage}\n\nPlease use the menu to navigate.`
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
   * Message d'erreur technique
   */
  static createTechnicalErrorMessage(to: string): WhatsAppOutgoingMessage {
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: '❌ *Technical error*\n\nAn error occurred while processing your request. Please try again later.'
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
   * Message d'option non reconnue
   */
  static createUnknownOptionMessage(to: string): WhatsAppOutgoingMessage {
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: '❓ *Unknown option*\n\nPlease use the menu to select a valid option.'
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
   * Message d'erreur de sélection de compte
   */
  static createAccountSelectionErrorMessage(to: string): WhatsAppOutgoingMessage {
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: '❌ *Account selection error*\n\nError occurred while selecting the account. Please try again.'
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
   * Message d'erreur de création de session
   */
  static createSessionCreationErrorMessage(to: string): WhatsAppOutgoingMessage {
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: '❌ *Session creation error*\n\nError occurred while creating the session. Please try again.'
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
   * Message d'erreur de connexion API
   */
  static createApiConnectionErrorMessage(to: string): WhatsAppOutgoingMessage {
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: '🔌 *Api connection error*\n\nUnable to connect to the banking service. Please try again in a few minutes.'
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
   * Message d'erreur de timeout
   */
  static createTimeoutErrorMessage(to: string): WhatsAppOutgoingMessage {
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: '⏱️ *Timeout error*\n\nThe request took too long. Please try again.'
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
   * Message d'erreur de validation
   */
  static createValidationErrorMessage(to: string, field: string): WhatsAppOutgoingMessage {
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: `⚠️ *Validation error*\n\nThe field "${field}" is not valid. Please verify and try again.`
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
   * Message d'erreur de service indisponible
   */
  static createServiceUnavailableMessage(to: string): WhatsAppOutgoingMessage {
    const interactive: WhatsAppInteractive = {
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

  /**
   * Message d'erreur de format invalide
   */
  static createInvalidFormatMessage(to: string, message: string): WhatsAppOutgoingMessage {
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: `⚠️ *Invalid format*\n\n${message}`
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
   * Message de session expirée
   */
  static createSessionExpiredMessage(to: string): WhatsAppOutgoingMessage {
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: '⏰ *Session expired*\n\nYour session has expired. Please restart your operation.'
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
   * Message d'erreur OTP invalide
   */
  static createInvalidOtpMessage(to: string): WhatsAppOutgoingMessage {
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: '🔐 *Invalid verification code*\n\nThe verification code you entered is incorrect or has expired.\n\nFor security reasons, your transfer has been cancelled. Please restart the process from the main menu.'
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
}