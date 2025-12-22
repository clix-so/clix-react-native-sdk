export declare class ClixInitCoordinator {
    private promise;
    private resolve;
    private reject;
    private isCompleted;
    private isFailed;
    constructor();
    waitForInitialization(): Promise<void>;
    completeInitialization(): void;
    failInitialization(error: Error): void;
    private isAlreadyFinalized;
}
//# sourceMappingURL=ClixInitCoordinator.d.ts.map