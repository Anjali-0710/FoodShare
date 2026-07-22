import path from 'path';
import fs from 'fs-extra';
import { logger } from './logger';

const screenshotDir = path.resolve(__dirname, '../screenshots');
fs.ensureDirSync(screenshotDir);

export class ScreenshotUtil {
  static async capture(driver: any, filename: string): Promise<string> {
    try {
      const sanitizedFilename = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase() + `_${Date.now()}.png`;
      const targetPath = path.join(screenshotDir, sanitizedFilename);
      await driver.saveScreenshot(targetPath);
      logger.info(`Screenshot captured: ${targetPath}`);
      return targetPath;
    } catch (err: any) {
      logger.error(`Failed to capture screenshot: ${err.message}`);
      return '';
    }
  }
}
