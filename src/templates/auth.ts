import { WhatsAppOutgoingMessage, WhatsAppInteractive } from '../types';
import { SystemButtonTemplates } from './systemButtons';

/**
 * Templates pour l'authentification et les sessions PIN
 */
export class AuthTemplates {
  
  /**
   * Message de demande de PIN avec lien sécurisé
   */
  static createPinRequestMessage(to: string, actionName: string, pinLink: string): WhatsAppOutgoingMessage {
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: `🔐 ${actionName}\n\nPlease enter your PIN.\n\nClick on the link below to enter your PIN securely:\n\n${pinLink}\n\n⚠️ This link expires in 5 minutes for your security.`
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
   * Message d'erreur d'authentification
   */
  static createAuthErrorMessage(to: string, errorMessage: string): WhatsAppOutgoingMessage {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: `❌ *Authentication error*\n\n${errorMessage}\n\nPlease verify your PIN and try again.`
      }
    };
  }

  /**
   * Message de session expirée
   */
  static createSessionExpiredMessage(to: string): WhatsAppOutgoingMessage {
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: '⏰ *Session expired*\n\nYour session has expired for security reasons. Please restart from the main menu.'
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
   * Message de PIN invalide
   */
  static createInvalidPinMessage(to: string): WhatsAppOutgoingMessage {
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: '❌ *Invalid PIN*\n\nThe PIN must contain 4 to 6 digits. Please try again.'
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
   * Message de validation PIN réussie
   */
  static createPinValidationSuccessMessage(): { success: boolean; message: string } {
    return {
      success: true,
      message: 'PIN validated successfully. Please check your WhatsApp for the next steps.'
    };
  }

  /**
   * Message d'erreur de traitement PIN
   */
  static createPinProcessingErrorMessage(): { success: boolean; message: string } {
    return {
      success: false,
      message: 'Error processing PIN. Please try again.'
    };
  }

  /**
   * Message de session invalide
   */
  static createInvalidSessionMessage(): { success: boolean; message: string } {
    return {
      success: false,
      message: 'Session expired or invalid. Please restart from WhatsApp.'
    };
  }

  /**
   * Message de PIN invalide pour l'API
   */
  static createInvalidPinApiMessage(): { success: boolean; message: string } {
    return {
      success: false,
      message: 'Invalid PIN. The PIN must contain 4 to 6 digits.'
    };
  }

  /**
   * Message de demande de nouveau PIN
   */
  static createNewPinRequestMessage(to: string, pinLink: string): WhatsAppOutgoingMessage {
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: `🔐 *Change PIN*\n\nYour current PIN has been validated.\n\nNow please enter your new PIN.\n\nClick on the link below to enter your new PIN securely:\n\n${pinLink}\n\n⚠️ This link expires in 10 minutes for your security.`
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
   * Message d'erreur PIN identique
   */
  static createSamePinErrorMessage(to: string): WhatsAppOutgoingMessage {
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: '❌ *Same PIN Error*\n\nYour new PIN must be different from your current PIN. Please choose a different PIN.'
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
   * Message de succès changement PIN
   */
  static createPinChangeSuccessMessage(to: string): WhatsAppOutgoingMessage {
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: '✅ *PIN Changed Successfully*\n\nYour PIN has been changed successfully. Please use your new PIN for future transactions.\n\n⚠️ Keep your new PIN confidential and secure.'
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
   * Message d'erreur changement PIN
   */
  static createPinChangeErrorMessage(to: string, errorMessage: string): WhatsAppOutgoingMessage {
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: `❌ *PIN Change Failed*\n\n${errorMessage}\n\nPlease try again or contact customer service if the problem persists.`
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