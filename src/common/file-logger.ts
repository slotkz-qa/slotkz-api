import type { LoggerService } from '@nestjs/common';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

type Level = 'INFO' | 'WARN' | 'ERROR';

const LOG_DIR = join(process.cwd(), 'logs');

export class FileLogger implements LoggerService {
  constructor() {
    mkdirSync(LOG_DIR, { recursive: true });
  }

  log(message: unknown, context?: string) {
    this.write('INFO', message, context);
  }

  warn(message: unknown, context?: string) {
    this.write('WARN', message, context);
  }

  error(message: unknown, stack?: string, context?: string) {
    this.write('ERROR', message, context, stack);
  }

  private write(level: Level, message: unknown, context?: string, stack?: string) {
    const line = `${new Date().toISOString()} ${level} [${context ?? 'App'}] ${String(message)}\n`;
    const entry = stack ? `${line}${stack}\n` : line;

    process.stdout.write(entry);
    appendFileSync(join(LOG_DIR, 'app.log'), entry);
    if (level === 'ERROR') appendFileSync(join(LOG_DIR, 'error.log'), entry);
  }
}
