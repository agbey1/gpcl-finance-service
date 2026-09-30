import fs from 'fs';
import path from 'path';

export type LogLevel = 'info' | 'warn' | 'error' | 'audit';

export interface LogPayload {
  message: string;
  level: LogLevel;
  timestamp: string;
  context?: Record<string, any>;
}

class Logger {
  private logsDir: string | null = null;

  constructor() {
    if (typeof window === 'undefined') {
      try {
        this.logsDir = path.resolve(process.cwd(), 'logs');
        if (!fs.existsSync(this.logsDir)) {
          fs.mkdirSync(this.logsDir, { recursive: true });
        }
      } catch (err) {
        // Fallback for restricted environments
        this.logsDir = null;
      }
    }
  }

  private writeToFile(filename: string, entry: string) {
    if (!this.logsDir) return;
    try {
      const filePath = path.join(this.logsDir, filename);
      fs.appendFileSync(filePath, entry + '\n', 'utf8');
    } catch (e) {
      // Ignore file write errors
    }
  }

  private format(level: LogLevel, message: string, context?: Record<string, any>): string {
    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context ? { context } : {}),
    };
    return JSON.stringify(payload);
  }

  info(message: string, context?: Record<string, any>) {
    const formatted = this.format('info', message, context);
    console.log(formatted);
    this.writeToFile('app.log', formatted);
  }

  warn(message: string, context?: Record<string, any>) {
    const formatted = this.format('warn', message, context);
    console.warn(formatted);
    this.writeToFile('app.log', formatted);
  }

  error(message: string, context?: Record<string, any>) {
    const formatted = this.format('error', message, context);
    console.error(formatted);
    this.writeToFile('app.log', formatted);
    this.writeToFile('error.log', formatted);
  }

  audit(message: string, context?: Record<string, any>) {
    const formatted = this.format('audit', `[AUDIT] ${message}`, context);
    console.log(formatted);
    this.writeToFile('audit.log', formatted);
  }
}

export const logger = new Logger();
