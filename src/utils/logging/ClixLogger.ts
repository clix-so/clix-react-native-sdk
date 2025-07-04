export enum ClixLogLevel {
  None = 0,
  Error = 1,
  Warn = 2,
  Info = 3,
  Debug = 4,
}

export class ClixLogger {
  private static _logLevel: ClixLogLevel = ClixLogLevel.Info;

  static setLogLevel(level: ClixLogLevel): void {
    this._logLevel = level;
  }

  static shouldLog(level: ClixLogLevel): boolean {
    return this._logLevel >= level;
  }

  static log(level: ClixLogLevel, message: string, error?: any): void {
    if (level > this._logLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    let logMessage = `[Clix][${timestamp}] ${message}`;
    if (error != null) {
      logMessage += ` - Error: ${error}`;
    }

    switch (level) {
      case ClixLogLevel.Debug:
        console.debug(`[DEBUG]${logMessage}`);
        break;
      case ClixLogLevel.Info:
        console.info(`[INFO]${logMessage}`);
        break;
      case ClixLogLevel.Warn:
        console.warn(`[WARN]${logMessage}`);
        break;
      case ClixLogLevel.Error:
        console.error(`[ERROR]${logMessage}`, error);
        break;
      case ClixLogLevel.None:
        return;
    }
  }

  static error(message: string, error?: any): void {
    this.log(ClixLogLevel.Error, message, error);
  }

  static warn(message: string, error?: any): void {
    this.log(ClixLogLevel.Warn, message, error);
  }

  static info(message: string, error?: any): void {
    this.log(ClixLogLevel.Info, message, error);
  }

  static debug(message: string, error?: any): void {
    this.log(ClixLogLevel.Debug, message, error);
  }
}
