export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
declare class Logger {
    private level;
    setLevel(level: LogLevel): void;
    private shouldLog;
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    success(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    event(type: string, details: string): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map