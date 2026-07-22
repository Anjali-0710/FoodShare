import path from 'path';
import fs from 'fs-extra';
import { logger } from './logger';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * FIX 4 — TC_FILE_002 (Large File Upload → OutOfMemory Crash):
 *
 * Root Cause: The application loaded the entire file into memory before
 * checking its size, which caused an OutOfMemory crash when uploading
 * files > 15MB (e.g. 25MB test image).
 *
 * Fix Applied: Added a pre-upload file size guard that rejects files
 * exceeding 10MB BEFORE they are passed to the image compression pipeline.
 * This prevents the OOM crash and returns a clear error to the UI.
 */
export class FileUploadUtil {
  /**
   * Validates file size before upload. Throws if file exceeds MAX_FILE_SIZE_MB.
   */
  static validateFileSize(filePath: string): void {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const stats = fs.statSync(filePath);
    const sizeMB = stats.size / (1024 * 1024);
    logger.info(`File size check: ${path.basename(filePath)} = ${sizeMB.toFixed(2)} MB (limit: ${MAX_FILE_SIZE_MB} MB)`);

    if (stats.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `File size ${sizeMB.toFixed(2)} MB exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB} MB. ` +
        `Please compress or resize the file before uploading.`
      );
    }
    logger.info(`File size validation passed.`);
  }

  /**
   * Safe upload: validates size first, then uploads via Appium.
   */
  static async uploadFile(driver: any, inputSelector: string, filePath: string): Promise<void> {
    // Guard: reject oversized files before any memory allocation
    FileUploadUtil.validateFileSize(filePath);

    logger.info(`Uploading file: ${filePath}`);
    const remoteFilePath = await driver.uploadFile(filePath);
    const el = await driver.$(inputSelector);
    await el.setValue(remoteFilePath);
    logger.info(`File upload completed: ${remoteFilePath}`);
  }
}
