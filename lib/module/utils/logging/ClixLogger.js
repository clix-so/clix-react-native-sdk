"use strict";

export let ClixLogLevel = /*#__PURE__*/function (ClixLogLevel) {
  ClixLogLevel[ClixLogLevel["NONE"] = 0] = "NONE";
  ClixLogLevel[ClixLogLevel["ERROR"] = 1] = "ERROR";
  ClixLogLevel[ClixLogLevel["WARN"] = 2] = "WARN";
  ClixLogLevel[ClixLogLevel["INFO"] = 3] = "INFO";
  ClixLogLevel[ClixLogLevel["DEBUG"] = 4] = "DEBUG";
  return ClixLogLevel;
}({});
export class ClixLogger {
  static logLevel = ClixLogLevel.INFO;
  static setLogLevel(level) {
    this.logLevel = level;
  }
  static shouldLog(level) {
    return this.logLevel >= level;
  }
  static log(level, message, error) {
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
  static error(message, error) {
    this.log(ClixLogLevel.ERROR, message, error);
  }
  static warn(message, error) {
    this.log(ClixLogLevel.WARN, message, error);
  }
  static info(message, error) {
    this.log(ClixLogLevel.INFO, message, error);
  }
  static debug(message, error) {
    this.log(ClixLogLevel.DEBUG, message, error);
  }
}
//# sourceMappingURL=ClixLogger.js.map