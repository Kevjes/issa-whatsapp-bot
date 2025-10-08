import { BankingLoginResponse, SoldeDTO, AccountNumber, TransferResponse, AccountValidationResponse } from '../types';
import { IBankingService } from '../core/interfaces/IBankingService';
import { IHttpClient } from '../core/interfaces/IHttpClient';
export declare class BankingService implements IBankingService {
    private baseUrl;
    private authService;
    private httpClient;
    constructor(httpClient: IHttpClient, authService: any);
    loginWithPin(phoneNumber: string, pin: string): Promise<BankingLoginResponse>;
    getAccountBalance(accountNumber: string): Promise<SoldeDTO>;
    getAccountInfo(accountNumber: string): Promise<any>;
    getAccountHistory(accountNumber: string, numberOfTransactions?: number): Promise<any>;
    formatAccountsForWhatsApp(accounts: AccountNumber[]): string;
    formatBalanceForWhatsApp(balance: SoldeDTO, accountNumber: string): string;
    createAccountSelectionMessage(accounts: AccountNumber[], action: string): any;
    isValidPhoneNumber(phoneNumber: string): boolean;
    isValidPin(pin: string): boolean;
    validateReceiverAccount(accountNumber: string): Promise<AccountValidationResponse>;
    doTransfer(transferRequest: any): Promise<TransferResponse>;
    changePin(phoneNumber: string, currentPin: string, newPin: string): Promise<any>;
    initiateOtpAuthentication(phoneNumber: string): Promise<any>;
    validateOtp(phoneNumber: string, otp: string): Promise<any>;
}
//# sourceMappingURL=bankingService.d.ts.map