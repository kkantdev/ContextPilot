import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private level: LogLevel = 'info';

  setLevel(level: LogLevel) {
    this.level = level;
  }

  private shouldLog(targetLevel: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(targetLevel) >= levels.indexOf(this.level);
  }

  debug(message: string, ...args: any[]) {
    if (this.shouldLog('debug')) {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  }

  info(message: string, ...args: any[]) {
    if (this.shouldLog('info')) {
      console.log(chalk.blue(`[INFO] `) + message, ...args);
    }
  }

  success(message: string, ...args: any[]) {
    if (this.shouldLog('info')) {
      console.log(chalk.green(`[SUCCESS] `) + message, ...args);
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn(chalk.yellow(`[WARN] ${message}`), ...args);
    }
  }

  error(message: string, ...args: any[]) {
    if (this.shouldLog('error')) {
      console.error(chalk.red(`[ERROR] ${message}`), ...args);
    }
  }

  event(type: string, details: string) {
    if (this.shouldLog('info')) {
      console.log(chalk.magenta(`⚡ [EVENT:${type}]`) + ` ${details}`);
    }
  }
}

export const logger = new Logger();
