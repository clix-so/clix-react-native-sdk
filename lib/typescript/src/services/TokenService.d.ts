import { StorageService } from './StorageService';
export declare class TokenService {
    private readonly storageService;
    private currentTokenKey;
    constructor(storageService: StorageService);
    getCurrentToken(): string | undefined;
    saveToken(token: string): void;
}
//# sourceMappingURL=TokenService.d.ts.map