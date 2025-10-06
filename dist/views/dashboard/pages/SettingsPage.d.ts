export interface SettingsPageData {
    systemSettings: {
        autoCleanup: boolean;
        cleanupInterval: number;
        logsRetention: number;
        sessionsRetention: number;
        maxSessionsPerUser: number;
        sessionTimeout: number;
    };
    whatsappSettings: {
        phoneNumberId: string;
        businessName: string;
        webhookUrl: string;
        verifyToken: string;
    };
    securitySettings: {
        jwtExpiration: string;
        refreshTokenExpiration: string;
        rateLimitWindow: number;
        rateLimitMax: number;
        adminRateLimitMax: number;
    };
    notificationSettings: {
        emailNotifications: boolean;
        smsNotifications: boolean;
        webhookNotifications: boolean;
        alertThresholds: {
            errorRate: number;
            responseTime: number;
            memoryUsage: number;
        };
    };
}
export declare class SettingsPage {
    private layout;
    constructor();
    render(data: SettingsPageData): string;
    private getPageScripts;
}
export default SettingsPage;
//# sourceMappingURL=SettingsPage.d.ts.map