import type { ClixConfig } from '../core/ClixConfig';
import type { HTTPResponse } from '../utils/http/HTTPResponse';
export interface APIResponse {
    status: number;
    data: any;
    headers: Record<string, string>;
}
export declare class ClixAPIClient {
    private readonly config;
    constructor(config: ClixConfig);
    private static readonly API_BASE_PATH;
    private getCommonHeaders;
    private buildUrl;
    get<T>(path: string, params?: Record<string, any>, headers?: Record<string, string>): Promise<HTTPResponse<T>>;
    post<T>(path: string, data?: any, params?: Record<string, any>, headers?: Record<string, string>): Promise<HTTPResponse<T>>;
    put<T>(path: string, data?: any, params?: Record<string, any>, headers?: Record<string, string>): Promise<HTTPResponse<T>>;
    delete<T>(path: string, params?: Record<string, any>, headers?: Record<string, string>): Promise<HTTPResponse<T>>;
}
//# sourceMappingURL=ClixAPIClient.d.ts.map