import { BankingAuthService } from './bankingAuthService';
export declare class OtpAuthService {
    private baseUrl;
    private authService;
    constructor(authService: BankingAuthService | null);
    sendOtp(phoneNumber: string): Promise<{
        success: boolean;
        message: string;
    }>;
    validateOtp(phoneNumber: string, otp: string): Promise<{
        success: boolean;
        message: string;
        accounts?: any[];
    }>;
    isValidOtpFormat(otp: string): boolean;
}
//# sourceMappingURL=otpAuthService.d.ts.map