import { IHttpClient, HttpRequestConfig, HttpResponse } from '../interfaces/IHttpClient';
export interface DefaultHeadersConfig {
    [key: string]: string | (() => string) | (() => Promise<string>);
}
export declare class HttpClient implements IHttpClient {
    private axiosInstance;
    private defaultHeaders;
    constructor(baseURL?: string, timeout?: number, ignoreSslErrors?: boolean);
    setDefaultHeaders(headers: DefaultHeadersConfig): void;
    setDefaultHeader(key: string, value: string | (() => string) | (() => Promise<string>)): void;
    removeDefaultHeader(key: string): void;
    private setupInterceptors;
    private sanitizeHeaders;
    private convertResponse;
    private convertConfig;
    get<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
    post<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
    put<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
    delete<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
}
//# sourceMappingURL=HttpClient.d.ts.map