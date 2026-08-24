"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const chalk_1 = __importDefault(require("chalk"));
class Logger {
    level = 'info';
    setLevel(level) {
        this.level = level;
    }
    shouldLog(targetLevel) {
        const levels = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(targetLevel) >= levels.indexOf(this.level);
    }
    debug(message, ...args) {
        if (this.shouldLog('debug')) {
            console.log(chalk_1.default.gray(`[DEBUG] ${message}`), ...args);
        }
    }
    info(message, ...args) {
        if (this.shouldLog('info')) {
            console.log(chalk_1.default.blue(`[INFO] `) + message, ...args);
        }
    }
    success(message, ...args) {
        if (this.shouldLog('info')) {
            console.log(chalk_1.default.green(`[SUCCESS] `) + message, ...args);
        }
    }
    warn(message, ...args) {
        if (this.shouldLog('warn')) {
            console.warn(chalk_1.default.yellow(`[WARN] ${message}`), ...args);
        }
    }
    error(message, ...args) {
        if (this.shouldLog('error')) {
            console.error(chalk_1.default.red(`[ERROR] ${message}`), ...args);
        }
    }
    event(type, details) {
        if (this.shouldLog('info')) {
            console.log(chalk_1.default.magenta(`⚡ [EVENT:${type}]`) + ` ${details}`);
        }
    }
}
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map