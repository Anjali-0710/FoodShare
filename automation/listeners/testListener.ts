import { logger } from '../utils/logger';
import { ScreenshotUtil } from '../utils/screenshotUtil';

export interface TestResult {
  id: string;
  module: string;
  name: string;
  status: 'Passed' | 'Failed' | 'Skipped' | 'Blocked';
  executionTimeMs: number;
  failureReason?: string;
  screenshotPath?: string;
  stackTrace?: string;
}

/**
 * TestListener — intercepts test lifecycle events (start, pass, fail, skip)
 * and records structured results, screenshots, and stack traces.
 *
 * Fulfils the "Listeners" folder requirement for enterprise POM frameworks.
 */
export class TestListener {
  private results: TestResult[] = [];
  private startTimes: Map<string, number> = new Map();

  onTestStart(id: string, name: string): void {
    this.startTimes.set(id, Date.now());
    logger.info(`[START] ${id}: ${name}`);
  }

  onTestPass(id: string, module: string, name: string): void {
    const elapsed = Date.now() - (this.startTimes.get(id) ?? Date.now());
    this.results.push({ id, module, name, status: 'Passed', executionTimeMs: elapsed });
    logger.info(`[PASS ] ${id} (${elapsed}ms)`);
  }

  async onTestFail(
    id: string,
    module: string,
    name: string,
    reason: string,
    driver?: any,
    err?: Error
  ): Promise<void> {
    const elapsed = Date.now() - (this.startTimes.get(id) ?? Date.now());
    let screenshotPath = '';
    if (driver) {
      screenshotPath = await ScreenshotUtil.capture(driver, `FAIL_${id}`);
    }
    this.results.push({
      id, module, name,
      status: 'Failed',
      executionTimeMs: elapsed,
      failureReason: reason,
      screenshotPath,
      stackTrace: err?.stack
    });
    logger.error(`[FAIL ] ${id}: ${reason} (${elapsed}ms)`);
  }

  onTestSkip(id: string, module: string, name: string, reason: string): void {
    const elapsed = Date.now() - (this.startTimes.get(id) ?? Date.now());
    this.results.push({ id, module, name, status: 'Skipped', executionTimeMs: elapsed, failureReason: reason });
    logger.warn(`[SKIP ] ${id}: ${reason}`);
  }

  getResults(): TestResult[] {
    return this.results;
  }

  getSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'Passed').length;
    const failed = this.results.filter(r => r.status === 'Failed').length;
    const skipped = this.results.filter(r => r.status === 'Skipped').length;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(2) : '0.00';
    return { total, passed, failed, skipped, passRate };
  }
}
