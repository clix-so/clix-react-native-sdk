import { DeviceService } from './DeviceService';
import { EventAPIService } from './EventAPIService';
export declare class EventService {
    private readonly eventAPIService;
    private readonly deviceService;
    constructor(eventAPIService: EventAPIService, deviceService: DeviceService);
    private serializeProperties;
    trackEvent(name: string, properties?: Record<string, any>, messageId?: string, userJourneyId?: string, userJourneyNodeId?: string): Promise<void>;
}
//# sourceMappingURL=EventService.d.ts.map