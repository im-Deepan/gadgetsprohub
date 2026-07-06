/**
 * Centralized logging service supporting standard log levels.
 * Guarantees uniform console reporting across separate extension threads.
 */
import { LogLevel } from '../types';

class LoggerService {
  private prefix = '[GadgetsProHub]';

  private log(level: LogLevel, message: string, ...optionalParams: any[]) {
    const timestamp = new Date().toISOString();
    const formattedPrefix = `${this.prefix} [${timestamp}] [${level}]`;

    switch (level) {
      case 'DEBUG':
        console.debug(formattedPrefix, message, ...optionalParams);
        break;
      case 'INFO':
        console.log(formattedPrefix, message, ...optionalParams);
        break;
      case 'WARN':
        console.warn(formattedPrefix, message, ...optionalParams);
        break;
      case 'ERROR':
        console.error(formattedPrefix, message, ...optionalParams);
        break;
    }
  }

  public debug(message: string, ...optionalParams: any[]) {
    this.log('DEBUG', message, ...optionalParams);
  }

  public info(message: string, ...optionalParams: any[]) {
    this.log('INFO', message, ...optionalParams);
  }

  public warn(message: string, ...optionalParams: any[]) {
    this.log('WARN', message, ...optionalParams);
  }

  public error(message: string, ...optionalParams: any[]) {
    this.log('ERROR', message, ...optionalParams);
  }
}

export const logger = new LoggerService();
