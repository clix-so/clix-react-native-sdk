import { ClixLogLevel } from '../utils/logging/ClixLogger';
export interface ClixConfig {
    projectId: string;
    apiKey: string;
    endpoint: string;
    logLevel: ClixLogLevel;
    extraHeaders: Record<string, string>;
}
//# sourceMappingURL=ClixConfig.d.ts.map