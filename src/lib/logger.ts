import fs from 'fs';
import path from 'path';

export type LogLevel = 'info' | 'warn' | 'error' | 'audit';

export interface LogPayload {
  message: string;
  level: LogLevel;
  timestamp: string;
  context?: Record<string, unknown>;
}

/**
 * Structured JSON logger. Always writes to stdout/stderr (collected by Docker,
 * PM2 or the host). Writing to ./logs is opt-in via LOG_TO_FILE=true and uses
 * async appends so request handling never blocks on disk I/O.
 */
class Logger {
  private logsDir: string | null = null;

  constructor() {
    if (typeof window !== 'undefined' || process.env.LOG_TO_FILE !== 'true') return;
    try {
      this.logsDir = path.resolve(process.cwd(), 'logs');
      fs.mkdirSync(this.logsDir, { recursive: true });
    } catch {
      this.logsDir = null;
    }
  }

  private writeToFile(filename: string, entry: string) {
    if (!this.logsDir) return;
    fs.appendFile(path.join(this.logsDir, filename), entry + '\n', 'utf8', () => {
      // Ignore file write errors; stdout remains the source of truth.
    });
  }

  private format(level: LogLevel, message: string, context?: Record<string, unknown>): string {
    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context ? { context } : {}),
    };
    return JSON.stringify(payload);
  }

  info(message: string, context?: Record<string, unknown>) {
    const formatted = this.format('info', message, context);
    console.log(formatted);
    this.writeToFile('app.log', formatted);
  }

  warn(message: string, context?: Record<string, unknown>) {
    const formatted = this.format('warn', message, context);
    console.warn(formatted);
    this.writeToFile('app.log', formatted);
  }

  error(message: string, context?: Record<string, unknown>) {
    const formatted = this.format('error', message, context);
    console.error(formatted);
    this.writeToFile('app.log', formatted);
    this.writeToFile('error.log', formatted);
  }

  audit(message: string, context?: Record<string, unknown>) {
    const formatted = this.format('audit', `[AUDIT] ${message}`, context);
    console.log(formatted);
    this.writeToFile('audit.log', formatted);
  }
}

export const logger = new Logger();
