"use strict";

import { ClixVersion } from "../core/ClixVersion.js";
import { HTTPClient } from "../utils/http/HTTPClient.js";
import { ClixLogger } from "../utils/logging/ClixLogger.js";
export class ClixAPIClient {
  constructor(config) {
    this.config = config;
  }
  static API_BASE_PATH = '/api/v1';
  async getCommonHeaders() {
    const version = await ClixVersion.getVersion();
    const headers = {
      'Content-Type': 'application/json',
      'X-Clix-Project-ID': this.config.projectId,
      'X-Clix-API-Key': this.config.apiKey,
      'User-Agent': `clix-react-native-sdk@${version}`,
      ...this.config.extraHeaders
    };
    return headers;
  }
  buildUrl(path) {
    const endpoint = this.config.endpoint || 'https://api.clix.so';
    const baseUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    const fullPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${ClixAPIClient.API_BASE_PATH}${fullPath}`;
  }
  async get(path, params, headers) {
    const url = this.buildUrl(path);
    const commonHeaders = await this.getCommonHeaders();
    const requestHeaders = {
      ...commonHeaders,
      ...headers
    };
    ClixLogger.debug(`API GET ${path}`);
    ClixLogger.debug(`Making request to: ${url}`);
    if (params && Object.keys(params).length > 0) {
      ClixLogger.debug(`Query Parameters: ${JSON.stringify(params)}`);
    }
    try {
      const response = await HTTPClient.shared.get(url, params, requestHeaders);
      ClixLogger.debug(`Response Status: ${response.statusCode}`);
      ClixLogger.debug(`Response Body: ${JSON.stringify(response.data)}`);
      return response;
    } catch (error) {
      ClixLogger.error(`GET ${path} failed`, error);
      throw error;
    }
  }
  async post(path, data, params, headers) {
    const url = this.buildUrl(path);
    const commonHeaders = await this.getCommonHeaders();
    const requestHeaders = {
      ...commonHeaders,
      ...headers
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
      const response = await HTTPClient.shared.post(url, data, params, requestHeaders);
      ClixLogger.debug(`Response Status: ${response.statusCode}`);
      ClixLogger.debug(`Response Body: ${JSON.stringify(response.data)}`);
      return response;
    } catch (error) {
      ClixLogger.error(`POST ${path} failed`, error);
      throw error;
    }
  }
  async put(path, data, params, headers) {
    const url = this.buildUrl(path);
    const commonHeaders = await this.getCommonHeaders();
    const requestHeaders = {
      ...commonHeaders,
      ...headers
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
      const response = await HTTPClient.shared.put(url, data, params, requestHeaders);
      ClixLogger.debug(`Response Status: ${response.statusCode}`);
      ClixLogger.debug(`Response Body: ${JSON.stringify(response.data)}`);
      return response;
    } catch (error) {
      ClixLogger.error(`PUT ${path} failed`, error);
      throw error;
    }
  }
  async delete(path, params, headers) {
    const url = this.buildUrl(path);
    const commonHeaders = await this.getCommonHeaders();
    const requestHeaders = {
      ...commonHeaders,
      ...headers
    };
    ClixLogger.debug(`API DELETE ${path}`);
    ClixLogger.debug(`Making request to: ${url}`);
    if (params && Object.keys(params).length > 0) {
      ClixLogger.debug(`Query Parameters: ${JSON.stringify(params)}`);
    }
    try {
      const response = await HTTPClient.shared.delete(url, params, requestHeaders);
      ClixLogger.debug(`Response Status: ${response.statusCode}`);
      ClixLogger.debug(`Response Body: ${JSON.stringify(response.data)}`);
      return response;
    } catch (error) {
      ClixLogger.error(`DELETE ${path} failed`, error);
      throw error;
    }
  }
}
//# sourceMappingURL=ClixAPIClient.js.map