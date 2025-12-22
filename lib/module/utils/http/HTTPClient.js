"use strict";

import { ClixLogger } from "../logging/ClixLogger.js";
import { HTTPMethod } from "./HTTPMethod.js";
export class HTTPClient {
  static shared = new HTTPClient();
  async request(request) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      ClixLogger.warn(`HTTP request to ${request.url} timed out after 2000ms`);
      controller.abort();
    }, 2000);
    const url = this.buildUrlWithParams(request.url, request.params);
    const headers = {
      ...(request.headers || {})
    };
    const init = {
      method: request.method,
      headers,
      signal: controller.signal
    };
    const body = this.prepareBody(request.data);
    if (body !== undefined && request.method !== HTTPMethod.GET && request.method !== HTTPMethod.DELETE) {
      init.body = body;
    }
    const response = await fetch(url, init);
    const data = await this.parseResponse(response);
    clearTimeout(timeoutId);
    return {
      data,
      statusCode: response.status,
      headers: this.headersToRecord(response.headers)
    };
  }
  async get(url, params, headers) {
    return this.request({
      method: HTTPMethod.GET,
      url,
      params,
      headers
    });
  }
  async post(url, data, params, headers) {
    return this.request({
      method: HTTPMethod.POST,
      url,
      data,
      params,
      headers
    });
  }
  async put(url, data, params, headers) {
    return this.request({
      method: HTTPMethod.PUT,
      url,
      data,
      params,
      headers
    });
  }
  async delete(url, params, headers) {
    return this.request({
      method: HTTPMethod.DELETE,
      url,
      params,
      headers
    });
  }
  buildUrlWithParams(url, params) {
    if (!params || Object.keys(params).length === 0) {
      return url;
    }
    const queryString = Object.entries(params).flatMap(([key, value]) => {
      if (value === null || value === undefined) {
        return [];
      }
      if (Array.isArray(value)) {
        return value.filter(item => item !== null && item !== undefined).map(item => `${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
    }).filter(Boolean).join('&');
    if (!queryString) {
      return url;
    }
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${queryString}`;
  }
  prepareBody(data) {
    if (data === undefined || data === null) {
      return undefined;
    }
    return JSON.stringify(data);
  }
  async parseResponse(response) {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  }
  headersToRecord(headers) {
    const record = {};
    headers.forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }
}
//# sourceMappingURL=HTTPClient.js.map