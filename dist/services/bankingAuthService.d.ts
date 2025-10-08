import { IHttpClient } from '../core/interfaces/IHttpClient';
import { IBankingAuthService } from '../core/interfaces/IBankingAuthService';
import { DatabaseService } from './databaseService';
export declare class BankingAuthService implements IBankingAuthService {
    private httpClient;
    private databaseService;
    private currentToken;
    private tokenExpiresAt;
    constructor(httpClient: IHttpClient, databaseService: DatabaseService);
    initialize(): Promise<void>;
    getValidToken(): Promise<string>;
    private authenticateWithBankingAPI;
    private refreshTokenInternal;
    invalidateToken(): Promise<void>;
    isTokenValid(): Promise<boolean>;
    refreshToken(): Promise<string>;
    private isTokenValidInternal;
    private loadTokenFromDatabase;
    private saveTokenToDatabase;
    startTokenRefreshScheduler(): void;
}
//# sourceMappingURL=bankingAuthService.d.ts.map