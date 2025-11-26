import { BankingLoginResponse, SoldeDTO, AccountNumber, TransferRequest, TransferResponse, AccountValidationResponse } from '../../types';
export interface IBankingService {
    loginWithPin(phoneNumber: string, pin: string): Promise<BankingLoginResponse>;
    getAccountBalance(accountNumber: string): Promise<SoldeDTO>;
    getAccountInfo(accountNumber: string): Promise<any>;
    getAccountHistory(accountNumber: string, numberOfTransactions?: number): Promise<any>;
    formatAccountsForWhatsApp(accounts: AccountNumber[]): string;
    formatBalanceForWhatsApp(balance: SoldeDTO, accountNumber: string): string;
    createAccountSelectionMessage(accounts: AccountNumber[], action: string): any;
    validateReceiverAccount(accountNumber: string): Promise<AccountValidationResponse>;
    doTransfer(transferRequest: TransferRequest): Promise<TransferResponse>;
}
//# sourceMappingURL=IBankingService.d.ts.map