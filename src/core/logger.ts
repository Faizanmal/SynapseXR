/**
 * Structured logger with severity levels, timestamps, and contextual prefixes.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private currentLevel: LogLevel = 'info';

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.currentLevel];
  }

  private format(level: LogLevel, context: string, message: string): string {
    const timestamp = new Date().toISOString().split('T')[1].replace('Z', '');
    return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
  }

  debug(context: string, message: string, data?: unknown): void {
    if (this.shouldLog('debug')) {
      if (data !== undefined) {
        console.debug(this.format('debug', context, message), data);
      } else {
        console.debug(this.format('debug', context, message));
      }
    }
  }

  info(context: string, message: string, data?: unknown): void {
    if (this.shouldLog('info')) {
      if (data !== undefined) {
        console.info(this.format('info', context, message), data);
      } else {
        console.info(this.format('info', context, message));
      }
    }
  }

  warn(context: string, message: string, data?: unknown): void {
    if (this.shouldLog('warn')) {
      if (data !== undefined) {
        console.warn(this.format('warn', context, message), data);
      } else {
        console.warn(this.format('warn', context, message));
      }
    }
  }

  error(context: string, message: string, error?: unknown): void {
    if (this.shouldLog('error')) {
      if (error !== undefined) {
        console.error(this.format('error', context, message), error);
      } else {
        console.error(this.format('error', context, message));
      }
    }
  }
}

export const logger = new Logger();

