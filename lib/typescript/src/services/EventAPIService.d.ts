import { ClixAPIClient } from './ClixAPIClient';
export declare class EventAPIService {
    private readonly apiClient;
    constructor(apiClient: ClixAPIClient);
    trackEvent(deviceId: string, name: string, properties: Record<string, any>, messageId?: string, userJourneyId?: string, userJourneyNodeId?: string): Promise<void>;
}
//# sourceMappingURL=EventAPIService.d.ts.map