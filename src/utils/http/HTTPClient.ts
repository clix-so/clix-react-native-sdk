import { ClixLogger } from '../logging/ClixLogger';
import { HTTPMethod } from './HTTPMethod';
import type { HTTPRequest } from './HTTPRequest';
import type { HTTPResponse } from './HTTPResponse';

export class HTTPClient {
  static shared = new HTTPClient();

  async request<T>(request: HTTPRequest): Promise<HTTPResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      ClixLogger.warn(`HTTP request to ${request.url} timed out after 2000ms`);
      controller.abort();
    }, 2000);

    const url = this.buildUrlWithParams(request.url, request.params);
    const headers = { ...(request.headers || {}) };
    const init: RequestInit = {
      method: request.method,
      headers,
      signal: controller.signal,
    };

    const body = this.prepareBody(request.data);
    if (
      body !== undefined &&
      request.method !== HTTPMethod.GET &&
      request.method !== HTTPMethod.DELETE
    ) {
      init.body = body;
    }

    const response = await fetch(url, init);
    const data = await this.parseResponse<T>(response);

    clearTimeout(timeoutId);

    return {
      data,
      statusCode: response.status,
      headers: this.headersToRecord(response.headers),
    };
  }

  async get<T>(
    url: string,
    params?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<HTTPResponse<T>> {
    return this.request<T>({ method: HTTPMethod.GET, url, params, headers });
  }

  async post<T>(
    url: string,
    data?: any,
    params?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<HTTPResponse<T>> {
    return this.request<T>({
      method: HTTPMethod.POST,
      url,
      data,
      params,
      headers,
    });
  }

  async put<T>(
    url: string,
    data?: any,
    params?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<HTTPResponse<T>> {
    return this.request<T>({
      method: HTTPMethod.PUT,
      url,
      data,
      params,
      headers,
    });
  }

  async delete<T>(
    url: string,
    params?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<HTTPResponse<T>> {
    return this.request<T>({ method: HTTPMethod.DELETE, url, params, headers });
  }

  private buildUrlWithParams(
    url: string,
    params?: Record<string, any>
  ): string {
    if (!params || Object.keys(params).length === 0) {
      return url;
    }

    const queryString = Object.entries(params)
      .flatMap(([key, value]) => {
        if (value === null || value === undefined) {
          return [];
        }

        if (Array.isArray(value)) {
          return value
            .filter((item) => item !== null && item !== undefined)
            .map(
              (item) =>
                `${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`
            );
        }

        return `${encodeURIComponent(key)}=${encodeURIComponent(
          String(value)
        )}`;
      })
      .filter(Boolean)
      .join('&');

    if (!queryString) {
      return url;
    }

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${queryString}`;
  }

  private prepareBody(data: any): BodyInit | undefined {
    if (data === undefined || data === null) {
      return undefined;
    }

    return JSON.stringify(data);
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      return (await response.json()) as T;
    }

    return (await response.text()) as unknown as T;
  }

  private headersToRecord(headers: Headers): Record<string, string> {
    const record: Record<string, string> = {};
    headers.forEach((value: string, key: string) => {
      record[key] = value;
    });
    return record;
  }
}
