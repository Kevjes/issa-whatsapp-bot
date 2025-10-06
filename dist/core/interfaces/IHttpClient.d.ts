export interface IHttpClient {
    get<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
    post<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
    put<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
    delete<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
}
export interface HttpRequestConfig {
    headers?: Record<string, string>;
    timeout?: number;
    params?: Record<string, string | number>;
}
export interface HttpResponse<T> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
}
export interface HttpError extends Error {
    status?: number;
    response?: {
        data?: unknown;
        status: number;
        statusText: string;
    };
}
//# sourceMappingURL=IHttpClient.d.ts.map