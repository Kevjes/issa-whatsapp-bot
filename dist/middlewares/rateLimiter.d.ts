export declare const generalRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const webhookRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const aiRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const adminRateLimit: import("express-rate-limit").RateLimitRequestHandler;
declare class UserRateLimiter {
    private userLimits;
    private maxRequests;
    private windowMs;
    constructor(maxRequests?: number, windowMs?: number);
    check(userId: string): {
        allowed: boolean;
        resetTime?: number;
    };
    private cleanup;
}
export declare const userRateLimiter: UserRateLimiter;
export {};
//# sourceMappingURL=rateLimiter.d.ts.map