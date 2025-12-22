export declare class StorageService {
    private storage;
    constructor(projectId: string);
    private getStoragePath;
    private initializeCompat;
    /**
     * Delete a key from storage (works with both v2/v3 and v4 APIs)
     */
    private removeCompat;
    set<T>(key: string, value: T): void;
    get<T>(key: string): T | undefined;
    remove(key: string): void;
    clear(): void;
    getAllKeys(): string[];
}
//# sourceMappingURL=StorageService.d.ts.map