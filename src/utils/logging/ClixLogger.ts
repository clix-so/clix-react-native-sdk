export enum ClixLogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
}

export class ClixLogger {
  private static logLevel: ClixLogLevel = ClixLogLevel.INFO;

  static setLogLevel(level: ClixLogLevel): void {
    this.logLevel = level;
  }

  static shouldLog(level: ClixLogLevel): boolean {
    return this.logLevel >= level;
  }

  static log(level: ClixLogLevel, message: string, error?: any): void {
    if (level > this.logLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const messages = [`[Clix][${timestamp}] ${message}`, error].filter(Boolean);

    switch (level) {
      case ClixLogLevel.DEBUG:
        console.debug(...messages);
        break;
      case ClixLogLevel.INFO:
        console.info(...messages);
        break;
      case ClixLogLevel.WARN:
        console.warn(...messages);
        break;
      case ClixLogLevel.ERROR:
        console.error(...messages);
        break;
      case ClixLogLevel.NONE:
        return;
    }
  }

  static error(message: string, error?: any): void {
    this.log(ClixLogLevel.ERROR, message, error);
  }

  static warn(message: string, error?: any): void {
    this.log(ClixLogLevel.WARN, message, error);
  }

  static info(message: string, error?: any): void {
    this.log(ClixLogLevel.INFO, message, error);
  }

  static debug(message: string, error?: any): void {
    this.log(ClixLogLevel.DEBUG, message, error);
  }
}
