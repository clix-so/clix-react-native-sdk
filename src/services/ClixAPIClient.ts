import type { ClixConfig } from '../core/ClixConfig';
import { ClixVersion } from '../core/ClixVersion';
import { HTTPClient } from '../utils/http/HTTPClient';
import type { HTTPResponse } from '../utils/http/HTTPResponse';
import { ClixLogger } from '../utils/logging/ClixLogger';

export interface APIResponse {
  status: number;
  data: any;
  headers: Record<string, string>;
}

export class ClixAPIClient {
  constructor(private readonly config: ClixConfig) {}

  private static readonly API_BASE_PATH = '/api/v1';

  private async getCommonHeaders(): Promise<Record<string, string>> {
    const version = await ClixVersion.getVersion();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Clix-Project-ID': this.config.projectId,
      'X-Clix-API-Key': this.config.apiKey,
      'User-Agent': `clix-react-native-sdk@${version}`,
      ...this.config.extraHeaders,
    };

    return headers;
  }

  private buildUrl(path: string): string {
    const endpoint = this.config.endpoint || 'https://api.clix.so';
    const baseUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;

    const fullPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${ClixAPIClient.API_BASE_PATH}${fullPath}`;
  }

  async get<T>(
    path: string,
    params?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<HTTPResponse<T>> {
    const url = this.buildUrl(path);
    const commonHeaders = await this.getCommonHeaders();
    const requestHeaders = {
      ...commonHeaders,
      ...headers,
    };

    ClixLogger.debug(`API GET ${path}`);
    ClixLogger.debug(`Making request to: ${url}`);
    if (params && Object.keys(params).length > 0) {
      ClixLogger.debug(`Query Parameters: ${JSON.stringify(params)}`);
    }

    try {
      const response = await HTTPClient.shared.get<T>(
        url,
        params,
        requestHeaders
      );

      ClixLogger.debug(`Response Status: ${response.statusCode}`);
      ClixLogger.debug(`Response Body: ${JSON.stringify(response.data)}`);

      return response;
    } catch (error) {
      ClixLogger.error(`GET ${path} failed`, error);
      throw error;
    }
  }

  async post<T>(
    path: string,
    data?: any,
    params?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<HTTPResponse<T>> {
    const url = this.buildUrl(path);
    const commonHeaders = await this.getCommonHeaders();
    const requestHeaders = {
      ...commonHeaders,
      ...headers,
    };

    ClixLogger.debug(`API POST ${path}`);
    ClixLogger.debug(`Making request to: ${url}`);
    if (data) {
      ClixLogger.debug(`Request Body: ${JSON.stringify(data)}`);
    }
    if (params && Object.keys(params).length > 0) {
      ClixLogger.debug(`Query Parameters: ${JSON.stringify(params)}`);
    }

    try {
      const response = await HTTPClient.shared.post<T>(
        url,
        data,
        params,
        requestHeaders
      );

      ClixLogger.debug(`Response Status: ${response.statusCode}`);
      ClixLogger.debug(`Response Body: ${JSON.stringify(response.data)}`);

      return response;
    } catch (error) {
      ClixLogger.error(`POST ${path} failed`, error);
      throw error;
    }
  }

  async put<T>(
    path: string,
    data?: any,
    params?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<HTTPResponse<T>> {
    const url = this.buildUrl(path);
    const commonHeaders = await this.getCommonHeaders();
    const requestHeaders = {
      ...commonHeaders,
      ...headers,
    };

    ClixLogger.debug(`API PUT ${path}`);
    ClixLogger.debug(`Making request to: ${url}`);
    if (data) {
      ClixLogger.debug(`Request Body: ${JSON.stringify(data)}`);
    }
    if (params && Object.keys(params).length > 0) {
      ClixLogger.debug(`Query Parameters: ${JSON.stringify(params)}`);
    }

    try {
      const response = await HTTPClient.shared.put<T>(
        url,
        data,
        params,
        requestHeaders
      );

      ClixLogger.debug(`Response Status: ${response.statusCode}`);
      ClixLogger.debug(`Response Body: ${JSON.stringify(response.data)}`);

      return response;
    } catch (error) {
      ClixLogger.error(`PUT ${path} failed`, error);
      throw error;
    }
  }

  async delete<T>(
    path: string,
    params?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<HTTPResponse<T>> {
    const url = this.buildUrl(path);
    const commonHeaders = await this.getCommonHeaders();
    const requestHeaders = {
      ...commonHeaders,
      ...headers,
    };

    ClixLogger.debug(`API DELETE ${path}`);
    ClixLogger.debug(`Making request to: ${url}`);
    if (params && Object.keys(params).length > 0) {
      ClixLogger.debug(`Query Parameters: ${JSON.stringify(params)}`);
    }

    try {
      const response = await HTTPClient.shared.delete<T>(
        url,
        params,
        requestHeaders
      );

      ClixLogger.debug(`Response Status: ${response.statusCode}`);
      ClixLogger.debug(`Response Body: ${JSON.stringify(response.data)}`);

      return response;
    } catch (error) {
      ClixLogger.error(`DELETE ${path} failed`, error);
      throw error;
    }
  }
}
