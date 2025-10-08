import { BankingService } from './bankingService';
import { IWhatsAppService } from '../core/interfaces/IWhatsAppService';
import { TransferSession } from '../types';
export declare class TransferSessionService {
    private bankingService;
    private whatsappService;
    private activeSessions;
    private otpAuthService;
    constructor(bankingService: BankingService, whatsappService: IWhatsAppService);
    createTransferSession(phoneNumber: string, senderAccount: string): Promise<string>;
    getTransferSession(phoneNumber: string): Promise<TransferSession | null>;
    updateTransferSession(phoneNumber: string, updates: Partial<TransferSession>): Promise<boolean>;
    private closeSessionAndReturnToMenu;
    processReceiverAccountInput(phoneNumber: string, receiverAccount: string): Promise<void>;
    processAmountInput(phoneNumber: string, amountText: string): Promise<void>;
    processReasonInput(phoneNumber: string, reason: string): Promise<void>;
    initiateOtpAuthentication(phoneNumber: string): Promise<void>;
    processOtpValidation(phoneNumber: string, otp: string): Promise<void>;
    executeTransfer(phoneNumber: string): Promise<void>;
    private performActualTransfer;
    cancelTransfer(phoneNumber: string): Promise<void>;
    private cleanupExpiredSessions;
    private isValidAccountNumber;
    private parseAmount;
}
//# sourceMappingURL=transferSessionService.d.ts.map