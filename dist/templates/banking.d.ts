import { WhatsAppOutgoingMessage } from '../types';
import { SoldeDTO, AccountNumber, TransferRequest, TransferResponse } from '../types';
export declare class BankingTemplates {
    static formatBalanceMessage(balance: SoldeDTO, accountNumber: string): string;
    static createBalanceMessage(to: string, balance: SoldeDTO, accountNumber: string): WhatsAppOutgoingMessage;
    static createAccountSelectionMessage(to: string, accounts: AccountNumber[], action: string): WhatsAppOutgoingMessage;
    static createAccountInfoMessage(to: string, accountInfo: any, accountNumber: string): WhatsAppOutgoingMessage;
    static createMiniStatementMessage(to: string, history: any, accountNumber: string, accountCurrency?: string): WhatsAppOutgoingMessage;
    static formatAccountsListMessage(accounts: AccountNumber[]): string;
    private static formatAccountNumber;
    private static getActionText;
    private static formatAccountInfo;
    private static formatTransactionHistory;
    static createReceiverAccountInputMessage(to: string, senderAccount: string): WhatsAppOutgoingMessage;
    static createReceiverAccountConfirmationMessage(to: string, receiverAccount: string, accountHolder?: string): WhatsAppOutgoingMessage;
    static createAmountInputMessage(to: string, senderAccount: string, receiverAccount: string): WhatsAppOutgoingMessage;
    static createReasonInputMessage(to: string, amount: number, currency: string): WhatsAppOutgoingMessage;
    static createTransferPreviewMessage(to: string, transferData: TransferRequest, accountHolder?: string): WhatsAppOutgoingMessage;
    static createTransferSuccessMessage(to: string, transferResponse: TransferResponse, transferData: TransferRequest): WhatsAppOutgoingMessage;
    static createTransferErrorMessage(to: string, errorMessage: string): WhatsAppOutgoingMessage;
    static createInvalidReceiverAccountMessage(to: string): WhatsAppOutgoingMessage;
    static createOtpRequestMessage(to: string): WhatsAppOutgoingMessage;
}
//# sourceMappingURL=banking.d.ts.map