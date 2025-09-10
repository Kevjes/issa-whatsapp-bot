import { WhatsAppOutgoingMessage, WhatsAppInteractive, WhatsAppButton } from '../types';

/**
 * Templates for buttons
 */
export class SystemButtonTemplates {

  /**
   * Wahtsapp Cancel button
   */
  static whatsappCancelButton(): WhatsAppButton {
    return {
      type: 'reply',
      reply: {
        id: 'cancel',
        title: 'Cancel'
      }
    };
  }

  /**
   * Whatsapp Menu button
   */
  static whatsappMenuButton(): WhatsAppButton {
    return {
      type: 'reply',
      reply: {
        id: 'main_menu',
        title: 'MENU'
      }
    };
  }

  ///////////////////////////TRANSFERT/////////////////////////
  /**
   * Whatsapp Yes transfer receiver button
   */
  static whatsappYesTransferReceiverButton(): WhatsAppButton {
    return {
      type: 'reply',
      reply: {
        id: 'transfer_confirm_receiver',
        title: '✅ YES'
      }
    };
  }

  /**
   * Whatsapp No transfer receiver button
   */
  static whatsappNoTransferReceiverButton(): WhatsAppButton {
    return {
      type: 'reply',
      reply: {
        id: 'transfer_reject_receiver',
        title: '❌ NO'
      }
    };
  }

  /**
   * Whatsapp Yes transfer final button
   */
  static whatsappYesTransferFinalButton(): WhatsAppButton {
    return {
      type: 'reply',
      reply: {
        id: 'transfer_confirm_final',
        title: '✅ YES'
      }
    };
  }

  /**
   * Whatsapp No transfer final button
   */
  static whatsappNoTransferFinalButton(): WhatsAppButton {
    return {
      type: 'reply',
      reply: {
        id: 'transfer_cancel',
        title: '❌ NO'
      }
    };
  }

  /**
   * Whatsapp Retry transfer receiver button
   */
  static whatsappRetryTransferReceiverButton(): WhatsAppButton {
    return {
      type: 'reply',
      reply: {
        id: 'transfer_retry_receiver',
        title: '🔄 RETRY'
      }
    };
  }

  /**
   * Whatsapp cancel transfer button
   */
  static whatsappCancelTransferButton(): WhatsAppButton {
    return {
      type: 'reply',
      reply: {
        id: 'transfer_cancel',
        title: '❌ Cancel'
      }
    };
  }

  ///////////////////////////AUTRE/////////////////////////
}