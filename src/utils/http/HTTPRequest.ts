import { HTTPMethod } from './HTTPMethod';

export interface HTTPRequest {
  url: string;
  method: HTTPMethod;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  data?: any;
}
