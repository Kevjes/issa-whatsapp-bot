"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankingTemplates = void 0;
const systemButtons_1 = require("./systemButtons");
class BankingTemplates {
    static formatBalanceMessage(balance, accountNumber) {
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
    static createBalanceMessage(to, balance, accountNumber) {
        const balanceText = this.formatBalanceMessage(balance, accountNumber);
        const interactive = {
            type: 'button',
            body: {
                text: balanceText
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
    static createAccountSelectionMessage(to, accounts, action) {
        const actionText = this.getActionText(action);
        const sections = [{
                title: 'Select an account',
                rows: accounts.map((account, index) => ({
                    id: `account_${action}_${account.accountValue}`,
                    title: `Account ${index + 1}`,
                    description: `${this.formatAccountNumber(account.accountValue)} (${account.currency})`
                }))
            }];
        const interactive = {
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
    static createAccountInfoMessage(to, accountInfo, accountNumber) {
        const formattedAccount = this.formatAccountNumber(accountNumber);
        const interactive = {
            type: 'button',
            body: {
                text: `📋 *Account information*\n\n` +
                    `📋 Account: ${formattedAccount}\n` +
                    `${this.formatAccountInfo(accountInfo)}\n\n` +
                    `📅 Consulted on: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Juba' })}`
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
    static createMiniStatementMessage(to, history, accountNumber, accountCurrency) {
        const formattedAccount = this.formatAccountNumber(accountNumber);
        const interactive = {
            type: 'button',
            body: {
                text: `📄 *Mini statement*\n\n` +
                    `📋 Account: ${formattedAccount}\n` +
                    `${this.formatTransactionHistory(history, accountCurrency)}\n\n` +
                    `📅 Consulted on: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Juba' })}`
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
    static formatAccountsListMessage(accounts) {
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
    static formatAccountNumber(accountNumber, enableMasking = true) {
        if (enableMasking) {
            if (accountNumber.length > 15) {
                const start = accountNumber.substring(0, 4);
                const end = accountNumber.substring(accountNumber.length - 11);
                const middle = '*'.repeat(accountNumber.length - 15);
                return `${start}${middle}${end}`;
            }
            else if (accountNumber.length > 8) {
                const start = accountNumber.substring(0, 4);
                const end = accountNumber.substring(accountNumber.length - 4);
                const middle = '*'.repeat(accountNumber.length - 8);
                return `${start}${middle}${end}`;
            }
        }
        return accountNumber;
    }
    static getActionText(action) {
        const actionTexts = {
            'balance': 'check balance',
            'statement': 'view mini statement',
            'info': 'check account information',
            'transfer': 'make a transfer'
        };
        return actionTexts[action] || 'the requested operation';
    }
    static formatAccountInfo(accountInfo) {
        if (!accountInfo) {
            return 'Informations non disponibles';
        }
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
    static formatTransactionHistory(history, accountCurrency) {
        if (!history || !history.returnValue || !Array.isArray(history.returnValue) || history.returnValue.length === 0) {
            return 'Aucune transaction récente trouvée.';
        }
        let formattedHistory = '💳 *Last 5 transactions:*\n\n';
        history.returnValue.slice(0, 5).forEach((transaction, index) => {
            const date = transaction.tranDate ? new Date(transaction.tranDate).toLocaleDateString('en-US') : 'N/A';
            const amount = new Intl.NumberFormat('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(Math.abs(transaction.amt || 0));
            const isCredit = transaction.sens === 'C';
            const type = isCredit ? '📈 Credit' : '📉 Debit';
            const sign = isCredit ? '+' : '-';
            const currency = transaction.currency || accountCurrency || 'SSP';
            formattedHistory += `${index + 1}. ${type}\n`;
            formattedHistory += `   💰 ${sign}${amount} ${currency}\n`;
            formattedHistory += `   📅 ${date}\n`;
            if (transaction.title) {
                formattedHistory += `   📝 ${transaction.title}\n`;
            }
            if (transaction.ope) {
                formattedHistory += `   🔢 Op: ${transaction.ope}\n`;
            }
            formattedHistory += '\n';
        });
        return formattedHistory;
    }
    static createReceiverAccountInputMessage(to, senderAccount) {
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
    static createReceiverAccountConfirmationMessage(to, receiverAccount, accountHolder) {
        const formattedReceiver = this.formatAccountNumber(receiverAccount, false);
        const interactive = {
            type: 'button',
            body: {
                text: `🎯 *Verification of beneficiary account*\n\n` +
                    `📋 Account: ${formattedReceiver}\n` +
                    `${accountHolder ? `👤 account holder: ${accountHolder}\n` : ''}\n` +
                    `Please confirm if this is the account to which you want to transfer money :`
            },
            action: {
                buttons: [
                    systemButtons_1.SystemButtonTemplates.whatsappYesTransferReceiverButton(),
                    systemButtons_1.SystemButtonTemplates.whatsappNoTransferFinalButton(),
                    systemButtons_1.SystemButtonTemplates.whatsappMenuButton()
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
    static createAmountInputMessage(to, senderAccount, receiverAccount) {
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
    static createReasonInputMessage(to, amount, currency) {
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
    static createTransferPreviewMessage(to, transferData, accountHolder) {
        const formattedAmount = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(transferData.amount);
        const interactive = {
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
                    systemButtons_1.SystemButtonTemplates.whatsappYesTransferFinalButton(),
                    systemButtons_1.SystemButtonTemplates.whatsappNoTransferFinalButton(),
                    systemButtons_1.SystemButtonTemplates.whatsappMenuButton()
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
    static createTransferSuccessMessage(to, transferResponse, transferData) {
        const formattedAmount = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(transferData.amount);
        const interactive = {
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
                    `${this.formatAccountNumber(transferResponse.returnValue?.recipientAccount ?? transferData.receiverAccount, false)}\n\n` +
                    `💰 *AMOUNT*: ${formattedAmount} ${transferData.currency}\n` +
                    `💳*FEES*: ${transferResponse.returnValue?.fees ?? "0.0"} ${transferData.currency}\n\n` +
                    `📝 *REASON*: ${transferData.reason}`
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
    static createTransferErrorMessage(to, errorMessage) {
        const interactive = {
            type: 'button',
            body: {
                text: `❌ *Transfer error*\n\n` +
                    `An error occurred during the transfer :\n\n` +
                    `${errorMessage}\n\n` +
                    `Please try again or contact support.`
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
    static createInvalidReceiverAccountMessage(to) {
        const interactive = {
            type: 'button',
            body: {
                text: `❌ *Invalid beneficiary account*\n\n` +
                    `The account number you entered does not exist or is not valid.\n\n` +
                    `Please verify the number and try again.`
            },
            action: {
                buttons: [
                    systemButtons_1.SystemButtonTemplates.whatsappRetryTransferReceiverButton(),
                    systemButtons_1.SystemButtonTemplates.whatsappMenuButton()
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
    static createOtpRequestMessage(to) {
        const interactive = {
            type: 'button',
            body: {
                text: '🔐 *Security Verification*\n\nFor your security, we have sent a verification code to your registered phone number.\n\n📱 Please enter the 6-digit code you received:'
            },
            action: {
                buttons: [systemButtons_1.SystemButtonTemplates.whatsappCancelTransferButton()]
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
exports.BankingTemplates = BankingTemplates;
//# sourceMappingURL=banking.js.map