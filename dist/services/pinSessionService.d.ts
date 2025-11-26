import { DatabaseService } from './databaseService';
import { BankingService } from './bankingService';
import { IWhatsAppService } from '../core/interfaces/IWhatsAppService';
import { IPinSessionService } from '../core/interfaces/IPinSessionService';
import { AccountNumber, PinSession } from '../types';
import { TransferSessionService } from './transferSessionService';
export declare class PinSessionService implements IPinSessionService {
    private databaseService;
    private bankingService;
    private whatsappService;
    private transferSessionService?;
    private activeSessions;
    constructor(databaseService: DatabaseService, bankingService: BankingService, whatsappService: IWhatsAppService, transferSessionService?: TransferSessionService | undefined);
    createPinSession(phoneNumber: string, action: string, accountNumber?: string): Promise<string>;
    generatePinLink(sessionId: string): string;
    getPinSession(sessionId: string): Promise<PinSession | null>;
    processPinSubmission(sessionId: string, pin: string): Promise<{
        success: boolean;
        message: string;
    }>;
    private processAction;
    private handleBalanceAction;
    private handleAccountInfoAction;
    private handleMiniStatementAction;
    private handleTransferAction;
    private handleChangePinAction;
    private handleNewPinInput;
    private completePinSession;
    submitPin(sessionId: string, pin: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getActiveSessionByPhoneAndAction(phoneNumber: string, action: string): Promise<PinSession | null>;
    getValidSessionWithAccounts(phoneNumber: string): Promise<{
        session: PinSession;
        accounts: AccountNumber[];
    } | null>;
    updateSessionAccount(sessionId: string, accountNumber: string): Promise<void>;
    updateSessionAction(sessionId: string, action: string): Promise<void>;
    processActionWithAccount(sessionId: string): Promise<void>;
    private processBalanceForAccount;
    private processMiniStatementForAccount;
    private processAccountInfoForAccount;
    private processTransferForAccount;
    cleanupExpiredSessions(): Promise<void>;
    createPinRequestMessage(sessionId: string, action: string): string;
}
//# sourceMappingURL=pinSessionService.d.ts.map