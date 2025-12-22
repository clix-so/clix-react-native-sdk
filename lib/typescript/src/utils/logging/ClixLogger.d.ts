export declare enum ClixLogLevel {
    NONE = 0,
    ERROR = 1,
    WARN = 2,
    INFO = 3,
    DEBUG = 4
}
export declare class ClixLogger {
    private static logLevel;
    static setLogLevel(level: ClixLogLevel): void;
    static shouldLog(level: ClixLogLevel): boolean;
    static log(level: ClixLogLevel, message: string, error?: any): void;
    static error(message: string, error?: any): void;
    static warn(message: string, error?: any): void;
    static info(message: string, error?: any): void;
    static debug(message: string, error?: any): void;
}
//# sourceMappingURL=ClixLogger.d.ts.map