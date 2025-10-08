export interface IBankingAuthService {
    getValidToken(): Promise<string>;
    invalidateToken(): Promise<void>;
    isTokenValid(): Promise<boolean>;
    refreshToken(): Promise<string>;
}
//# sourceMappingURL=IBankingAuthService.d.ts.map