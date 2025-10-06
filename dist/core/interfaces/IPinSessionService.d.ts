import { PinSession, AccountNumber } from '../../types';
export interface IPinSessionService {
    createPinSession(phoneNumber: string, action: string, accountNumber?: string): Promise<string>;
    generatePinLink(sessionId: string): string;
    getPinSession(sessionId: string): Promise<PinSession | null>;
    processPinSubmission(sessionId: string, pin: string): Promise<{
        success: boolean;
        message: string;
    }>;
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
    processActionWithAccount(sessionId: string): Promise<void>;
    cleanupExpiredSessions(): Promise<void>;
    createPinRequestMessage(sessionId: string, action: string): string;
}
//# sourceMappingURL=IPinSessionService.d.ts.map