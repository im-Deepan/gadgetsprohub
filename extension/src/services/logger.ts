/**
 * Centralized logging service supporting standard log levels.
 * Guarantees uniform console reporting across separate extension threads.
 */
import { LogLevel } from '../types';

class LoggerService {
  private prefix = '[GadgetsProHub]';
  private isDebugEnabled = true;

  constructor() {
    this.updateDebugFlag();
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.gph_settings) {
          const newVal = changes.gph_settings.newValue;
          if (newVal) {
            this.isDebugEnabled = newVal.debugMode !== false;
          }
        }
      });
    }
  }

  private updateDebugFlag() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('gph_settings', (res) => {
        if (res?.gph_settings) {
          this.isDebugEnabled = res.gph_settings.debugMode !== false;
        }
      });
    }
  }

  private log(level: LogLevel, message: string, ...optionalParams: any[]) {
    if ((level === 'DEBUG' || level === 'INFO') && !this.isDebugEnabled) {
      return;
    }

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
