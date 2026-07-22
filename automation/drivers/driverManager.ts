import { remote } from 'webdriverio';
import { AppiumConfig } from '../config/appium.config';
import { logger } from '../utils/logger';

let _driver: any = null;

/**
 * DriverManager — singleton Appium WebDriver session manager.
 *
 * Provides a single shared driver instance across all test modules,
 * with built-in retry logic on session creation failure.
 */
export class DriverManager {
  static async getDriver(retries = 3): Promise<any> {
    if (_driver) return _driver;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        logger.info(`Creating Appium session (attempt ${attempt}/${retries})...`);
        _driver = await remote({
          hostname: AppiumConfig.hostname,
          port: AppiumConfig.port,
          path: AppiumConfig.path,
          capabilities: AppiumConfig.capabilities as any,
          connectionRetryCount: AppiumConfig.connectionRetryCount,
          connectionRetryTimeout: AppiumConfig.connectionRetryTimeout
        });
        logger.info('Appium session created successfully.');
        return _driver;
      } catch (err: any) {
        logger.error(`Session creation failed (attempt ${attempt}): ${err.message}`);
        if (attempt === retries) throw err;
        const backoff = attempt * 3000;
        logger.info(`Retrying in ${backoff / 1000}s...`);
        await new Promise(r => setTimeout(r, backoff));
      }
    }
  }

  static async closeDriver(): Promise<void> {
    if (_driver) {
      try {
        await _driver.deleteSession();
        logger.info('Appium session closed.');
      } catch (err: any) {
        logger.warn(`Error closing session: ${err.message}`);
      } finally {
        _driver = null;
      }
    }
  }

  static isActive(): boolean {
    return _driver !== null;
  }
}
