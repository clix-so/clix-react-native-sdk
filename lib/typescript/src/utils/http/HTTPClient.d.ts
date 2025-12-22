import type { HTTPRequest } from './HTTPRequest';
import type { HTTPResponse } from './HTTPResponse';
export declare class HTTPClient {
    static shared: HTTPClient;
    request<T>(request: HTTPRequest): Promise<HTTPResponse<T>>;
    get<T>(url: string, params?: Record<string, any>, headers?: Record<string, string>): Promise<HTTPResponse<T>>;
    post<T>(url: string, data?: any, params?: Record<string, any>, headers?: Record<string, string>): Promise<HTTPResponse<T>>;
    put<T>(url: string, data?: any, params?: Record<string, any>, headers?: Record<string, string>): Promise<HTTPResponse<T>>;
    delete<T>(url: string, params?: Record<string, any>, headers?: Record<string, string>): Promise<HTTPResponse<T>>;
    private buildUrlWithParams;
    private prepareBody;
    private parseResponse;
    private headersToRecord;
}
//# sourceMappingURL=HTTPClient.d.ts.map