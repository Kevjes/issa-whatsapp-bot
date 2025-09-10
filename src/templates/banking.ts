import { title } from 'process';
import { WhatsAppOutgoingMessage, WhatsAppInteractive } from '../types';
import { SoldeDTO, AccountNumber, TransferRequest, AccountValidationResponse, TransferResponse } from '../types';
import { SystemButtonTemplates } from './systemButtons';

/**
 * Templates pour les opérations bancaires
 */
export class BankingTemplates {
  
  /**
   * Formater le solde pour l'affichage WhatsApp
   */
  static formatBalanceMessage(balance: SoldeDTO, accountNumber: string): string {
    const formattedAccount = this.formatAccountNumber(accountNumber);
    const formattedBalance = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(balance.solde);

    return `💰 *Account balance*\n\n` +
           `📋 Account: ${formattedAccount}\n` +
           `💵 Balance: ${formattedBalance} ${balance.currency}\n\n` +
           `📅 Consulted on: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Juba' })}`;
  }

  /**
   * Message de solde avec bouton menu
   */
  static createBalanceMessage(to: string, balance: SoldeDTO, accountNumber: string): WhatsAppOutgoingMessage {
    const balanceText = this.formatBalanceMessage(balance, accountNumber);
    
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: balanceText
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
   * Message de sélection de compte
   */
  static createAccountSelectionMessage(to: string, accounts: AccountNumber[], action: string): WhatsAppOutgoingMessage {
    const actionText = this.getActionText(action);
    
    const sections = [{
      title: 'Select an account',
      rows: accounts.map((account, index) => ({
        id: `account_${action}_${account.accountValue}`,
        title: `Account ${index + 1}`,
        description: `${this.formatAccountNumber(account.accountValue)} (${account.currency})`
      }))
    }];

    const interactive: WhatsAppInteractive = {
      type: 'list',
      header: {
        type: 'text',
        text: '🏦 Afriland First Bank'
      },
      body: {
        text: `Please select the account for ${actionText} :`
      },
      footer: {
        text: 'Select an option'
      },
      action: {
        button: 'Select an account',
        sections: sections
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
   * Message d'informations de compte
   */
  static createAccountInfoMessage(to: string, accountInfo: any, accountNumber: string): WhatsAppOutgoingMessage {
    const formattedAccount = this.formatAccountNumber(accountNumber);
    
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: `📋 *Account information*\n\n` +
              `📋 Account: ${formattedAccount}\n` +
              `${this.formatAccountInfo(accountInfo)}\n\n` +
              `📅 Consulted on: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Juba' })}`
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
   * Message de mini relevé
   */
  static createMiniStatementMessage(to: string, history: any, accountNumber: string, accountCurrency?: string): WhatsAppOutgoingMessage {
    const formattedAccount = this.formatAccountNumber(accountNumber);
    
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: `📄 *Mini statement*\n\n` +
              `📋 Account: ${formattedAccount}\n` +
              `${this.formatTransactionHistory(history, accountCurrency)}\n\n` +
              `📅 Consulted on: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Juba' })}`
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
   * Message de liste des comptes
   */
  static formatAccountsListMessage(accounts: AccountNumber[]): string {
    if (!accounts || accounts.length === 0) {
      return 'Aucun compte trouvé.';
    }

    let message = '📋 *Vos comptes bancaires :*\n\n';
    
    accounts.forEach((account, index) => {
      const accountDisplay = this.formatAccountNumber(account.accountValue);
      message += `${index + 1}. 💳 ${accountDisplay}\n`;
      message += `   💰 Devise: ${account.currency}\n\n`;
    });

    return message;
  }

  /**
   * Formater un numéro de compte pour l'affichage (masquage partiel)
   */
  private static formatAccountNumber(accountNumber: string, enableMasking: boolean = true): string {
    if (enableMasking) {
      if (accountNumber.length > 15) {
        const start = accountNumber.substring(0, 4);
        const end = accountNumber.substring(accountNumber.length - 11);
        const middle = '*'.repeat(accountNumber.length - 15);
        return `${start}${middle}${end}`;
      } else if (accountNumber.length > 8) {
        const start = accountNumber.substring(0, 4);
        const end = accountNumber.substring(accountNumber.length - 4);
        const middle = '*'.repeat(accountNumber.length - 8);
        return `${start}${middle}${end}`;
      }
    }
    return accountNumber;
  }

  /**
   * Obtenir le texte d'action en anglais
   */
  private static getActionText(action: string): string {
    const actionTexts: { [key: string]: string } = {
      'balance': 'check balance',
      'statement': 'view mini statement',
      'info': 'check account information',
      'transfer': 'make a transfer'
    };
    
    return actionTexts[action] || 'the requested operation';
  }

  /**
   * Formater les informations de compte
   */
  private static formatAccountInfo(accountInfo: any): string {
    if (!accountInfo) {
      return 'Informations non disponibles';
    }

    // Adapter selon la structure réelle des données de l'API
    let info = '';
    if (accountInfo.accountType) {
      info += `🏷️ Type: ${accountInfo.accountType}\n`;
    }
    if (accountInfo.status) {
      info += `📊 Status: ${accountInfo.status}\n`;
    }
    if (accountInfo.openingDate) {
      info += `📅 Opened on: ${new Date(accountInfo.openingDate).toLocaleDateString('en-US')}\n`;
    }
    
    return info || 'Account details not available';
  }

  /**
   * Formater l'historique des transactions
   */
  private static formatTransactionHistory(history: any, accountCurrency?: string): string {
    // Vérifier la structure de la réponse API selon la documentation Swagger
    if (!history || !history.returnValue || !Array.isArray(history.returnValue) || history.returnValue.length === 0) {
      return 'Aucune transaction récente trouvée.';
    }

    let formattedHistory = '💳 *Last 5 transactions:*\n\n';
    
    // Limiter aux 5 dernières transactions
    history.returnValue.slice(0, 5).forEach((transaction: any, index: number) => {
      // Formater la date depuis le format de l'API (ex: "2025-07-16")
      const date = transaction.tranDate ? new Date(transaction.tranDate).toLocaleDateString('en-US') : 'N/A';
      
      // Formater le montant
      const amount = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(Math.abs(transaction.amt || 0));
      
      // Déterminer le type de transaction basé sur le champ 'sens' (D pour Débit, C pour Crédit)
      const isCredit = transaction.sens === 'C';
      const type = isCredit ? '📈 Credit' : '📉 Debit';
      const sign = isCredit ? '+' : '-';
      
      // Utiliser la devise de la transaction si disponible, sinon celle du compte, sinon SSP par défaut
      const currency = transaction.currency || accountCurrency || 'SSP';
      
      formattedHistory += `${index + 1}. ${type}\n`;
      formattedHistory += `   💰 ${sign}${amount} ${currency}\n`;
      formattedHistory += `   📅 ${date}\n`;
      
      // Utiliser le champ 'title' comme description
      if (transaction.title) {
        formattedHistory += `   📝 ${transaction.title}\n`;
      }
      
      // Ajouter le numéro d'opération si disponible
      if (transaction.ope) {
        formattedHistory += `   🔢 Op: ${transaction.ope}\n`;
      }
      
      formattedHistory += '\n';
    });

    return formattedHistory;
  }

  /**
   * Message de demande de numéro de compte bénéficiaire
   */
  static createReceiverAccountInputMessage(to: string, senderAccount: string): WhatsAppOutgoingMessage {
    const formattedSender = this.formatAccountNumber(senderAccount);
    
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: `💸 *Intra-bank transfer*\n\n` +
              `📤 Sender account: ${formattedSender}\n\n` +
              `🎯 *BENEFICIARY ACCOUNT*\n\n` +
              `Please enter the beneficiary account number :`
      }
    };
  }

  /**
   * Message de confirmation du compte bénéficiaire
   */
  static createReceiverAccountConfirmationMessage(to: string, receiverAccount: string, accountHolder?: string): WhatsAppOutgoingMessage {
    const formattedReceiver = this.formatAccountNumber(receiverAccount, false);
    
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: `🎯 *Verification of beneficiary account*\n\n` +
              `📋 Account: ${formattedReceiver}\n` +
              `${accountHolder ? `👤 account holder: ${accountHolder}\n` : ''}\n` +
              `Please confirm if this is the account to which you want to transfer money :`
      },
      action: {
        buttons: [
          SystemButtonTemplates.whatsappYesTransferReceiverButton(),
          SystemButtonTemplates.whatsappNoTransferFinalButton(),
          SystemButtonTemplates.whatsappMenuButton()
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
   * Message de demande de montant
   */
  static createAmountInputMessage(to: string, senderAccount: string, receiverAccount: string): WhatsAppOutgoingMessage {
    const formattedSender = this.formatAccountNumber(senderAccount);
    const formattedReceiver = this.formatAccountNumber(receiverAccount, false);
    
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: `💸 *Intra-bank transfer*\n\n` +
              `📤 Sender account: ${formattedSender}\n` +
              `📥 Receiver account: ${formattedReceiver}\n\n` +
              `💰 *AMOUNT* 💰\n\n` +
              `Please enter the amount of the transfer (integers only, no decimals):\n\n`
      }
    };
  }

  /**
   * Message de demande de raison
   */
  static createReasonInputMessage(to: string, amount: number, currency: string): WhatsAppOutgoingMessage {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
    
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: `💸 *Intra-bank transfer*\n\n` +
              `💰 Amount: ${formattedAmount} ${currency}\n\n` +
              `📝 *REASON* 📝\n\n` +
              `Please enter the reason for the transfer :`
      }
    };
  }

  /**
   * Message de prévisualisation du transfert
   */
  static createTransferPreviewMessage(to: string, transferData: TransferRequest, accountHolder?: string): WhatsAppOutgoingMessage {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(transferData.amount);
    
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: `💸 *CONFIRMATION OF TRANSFER*\n\n` +
              `Are you sure you want to transfer :\n\n` +
              `💰 Amount: ${formattedAmount} ${transferData.currency}\n` +
              `${accountHolder ? `👤 Beneficiary name: ${accountHolder}\n` : ''}` +
              `📋 Beneficiary account: ${transferData.receiverAccount}\n` +
              `📝 Reason: ${transferData.reason}\n\n` +
              `Please confirm !`
      },
      action: {
        buttons: [
          SystemButtonTemplates.whatsappYesTransferFinalButton(),
          SystemButtonTemplates.whatsappNoTransferFinalButton(),
          SystemButtonTemplates.whatsappMenuButton()
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
   * Message de succès du transfert
   */
  static createTransferSuccessMessage(to: string, transferResponse: TransferResponse, transferData: TransferRequest): WhatsAppOutgoingMessage {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(transferData.amount);
    
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: `✅ *TRANSFER SUCCESS*\n\n` +
              `Your transfer has been successfully completed !\n\n` +
              `📅 *DATE*: ${transferResponse.returnValue?.eventDate || new Date().toLocaleDateString('en-US', { timeZone: 'Africa/Juba' })}\n` +
              `🔗 *REF*: ${transferResponse.trxId || 'N/A'}\n\n` +
              `👤 *SENDER* ↗️\n` +
              `${transferResponse.returnValue?.custName || 'N/A'}\n` +
              `${this.formatAccountNumber(transferData.senderAccount)}\n\n` +
              `👤 *RECEIVER* ↙️\n` +
              `${transferResponse.returnValue?.recipientName || 'N/A'}\n` +
              `${this.formatAccountNumber(transferResponse.returnValue?.recipientAccount??transferData.receiverAccount, false)}\n\n` +
              `💰 *AMOUNT*: ${formattedAmount} ${transferData.currency}\n` +
              `💳*FEES*: ${transferResponse.returnValue?.fees??"0.0"} ${transferData.currency}\n\n` +
              `📝 *REASON*: ${transferData.reason}`
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
   * Message d'erreur de transfert
   */
  static createTransferErrorMessage(to: string, errorMessage: string): WhatsAppOutgoingMessage {
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: `❌ *Transfer error*\n\n` +
              `An error occurred during the transfer :\n\n` +
              `${errorMessage}\n\n` +
              `Please try again or contact support.`
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
   * Message de compte bénéficiaire invalide
   */
  static createInvalidReceiverAccountMessage(to: string): WhatsAppOutgoingMessage {
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: `❌ *Invalid beneficiary account*\n\n` +
              `The account number you entered does not exist or is not valid.\n\n` +
              `Please verify the number and try again.`
      },
      action: {
        buttons: [
          SystemButtonTemplates.whatsappRetryTransferReceiverButton(),
          SystemButtonTemplates.whatsappMenuButton()
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
   * Message de demande d'OTP pour le transfert
   */
  static createOtpRequestMessage(to: string): WhatsAppOutgoingMessage {
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: '🔐 *Security Verification*\n\nFor your security, we have sent a verification code to your registered phone number.\n\n📱 Please enter the 6-digit code you received:'
      },
      action: {
        buttons: [SystemButtonTemplates.whatsappCancelTransferButton()]
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