import type { ClixConfig } from '../core/ClixConfig';
import { ClixVersion } from '../core/ClixVersion';
import { ClixLogger } from '../utils/logging/ClixLogger';

export interface APIResponse {
  status: number;
  data: any;
  headers: Record<string, string>;
}

export class ClixAPIClient {
  private static readonly API_BASE_PATH = '/api/v1';

  constructor(private readonly config: ClixConfig) {}

  private async getCommonHeaders(): Promise<Record<string, string>> {
    const version = await ClixVersion.getVersion();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Clix-Project-ID': this.config.projectId,
      'X-Clix-API-Key': this.config.apiKey,
      'User-Agent': `clix-react-native-sdk/${version}`,
    };

    if (this.config.extraHeaders) {
      Object.assign(headers, this.config.extraHeaders);
    }

    return headers;
  }

  private buildUrl(path: string): string {
    const endpoint = this.config.endpoint || 'https://api.clix.so';
    const baseUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;

    const fullPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${ClixAPIClient.API_BASE_PATH}${fullPath}`;
  }

  private buildUrlWithQuery(
    path: string,
    queryParameters?: Record<string, any>
  ): string {
    const url = this.buildUrl(path);

    if (queryParameters && Object.keys(queryParameters).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(queryParameters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      return `${url}?${searchParams.toString()}`;
    }

    return url;
  }

  async get(
    path: string,
    options?: {
      headers?: Record<string, string>;
      queryParameters?: Record<string, any>;
    }
  ): Promise<APIResponse> {
    const url = this.buildUrlWithQuery(path, options?.queryParameters);
    const commonHeaders = await this.getCommonHeaders();
    const requestHeaders = {
      ...commonHeaders,
      ...options?.headers,
    };

    ClixLogger.debug(`API GET ${path}`);
    ClixLogger.debug(`Making request to: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: requestHeaders,
      });

      const data = await this.parseResponse(response);

      ClixLogger.debug(`Response Status: ${response.status}`);
      ClixLogger.debug(`Response Body: ${JSON.stringify(data)}`);

      return {
        status: response.status,
        data,
        headers: this.headersToRecord(response.headers),
      };
    } catch (error) {
      ClixLogger.error(`GET ${path} failed`, error);
      throw error;
    }
  }

  async post(
    path: string,
    options?: {
      headers?: Record<string, string>;
      queryParameters?: Record<string, any>;
      body?: any;
    }
  ): Promise<APIResponse> {
    const url = this.buildUrlWithQuery(path, options?.queryParameters);
    const commonHeaders = await this.getCommonHeaders();
    const requestHeaders = {
      ...commonHeaders,
      ...options?.headers,
    };

    ClixLogger.debug(`API POST ${path}`);
    if (options?.body) {
      ClixLogger.debug(`Request Body: ${JSON.stringify(options.body)}`);
    }
    if (
      options?.queryParameters &&
      Object.keys(options.queryParameters).length > 0
    ) {
      ClixLogger.debug(
        `Query Parameters: ${JSON.stringify(options.queryParameters)}`
      );
    }

    const body = options?.body ? JSON.stringify(options.body) : undefined;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body,
      });

      const data = await this.parseResponse(response);

      ClixLogger.debug(`Response Status: ${response.status}`);
      ClixLogger.debug(`Response Body: ${JSON.stringify(data)}`);

      return {
        status: response.status,
        data,
        headers: this.headersToRecord(response.headers),
      };
    } catch (error) {
      ClixLogger.error(`POST ${path} failed`, error);
      throw error;
    }
  }

  async put(
    path: string,
    options?: {
      headers?: Record<string, string>;
      queryParameters?: Record<string, any>;
      body?: any;
    }
  ): Promise<APIResponse> {
    const url = this.buildUrlWithQuery(path, options?.queryParameters);
    const commonHeaders = await this.getCommonHeaders();
    const requestHeaders = {
      ...commonHeaders,
      ...options?.headers,
    };

    ClixLogger.debug(`API PUT ${path}`);

    const body = options?.body ? JSON.stringify(options.body) : undefined;

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: requestHeaders,
        body,
      });

      const data = await this.parseResponse(response);

      ClixLogger.debug(`Response Status: ${response.status}`);
      ClixLogger.debug(`Response Body: ${JSON.stringify(data)}`);

      return {
        status: response.status,
        data,
        headers: this.headersToRecord(response.headers),
      };
    } catch (error) {
      ClixLogger.error(`PUT ${path} failed`, error);
      throw error;
    }
  }

  async delete(
    path: string,
    options?: {
      headers?: Record<string, string>;
      queryParameters?: Record<string, any>;
    }
  ): Promise<APIResponse> {
    const url = this.buildUrlWithQuery(path, options?.queryParameters);
    const commonHeaders = await this.getCommonHeaders();
    const requestHeaders = {
      ...commonHeaders,
      ...options?.headers,
    };

    ClixLogger.debug(`API DELETE ${path}`);

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: requestHeaders,
      });

      const data = await this.parseResponse(response);

      ClixLogger.debug(`Response Status: ${response.status}`);
      ClixLogger.debug(`Response Body: ${JSON.stringify(data)}`);

      return {
        status: response.status,
        data,
        headers: this.headersToRecord(response.headers),
      };
    } catch (error) {
      ClixLogger.error(`DELETE ${path} failed`, error);
      throw error;
    }
  }

  private async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return await response.text();
  }

  private headersToRecord(headers: Headers): Record<string, string> {
    const record: Record<string, string> = {};
    headers.forEach((value: any, key: string) => {
      record[key] = value;
    });
    return record;
  }
}
