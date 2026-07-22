import { logger } from '../utils/logger';

export class BasePage {
  protected driver: any;

  constructor(driver: any) {
    this.driver = driver;
  }

  async waitForElement(selector: string, timeout: number = 10000): Promise<any> {
    logger.info(`Waiting for element: ${selector}`);
    const el = await this.driver.$(selector);
    await el.waitForDisplayed({ timeout });
    return el;
  }

  async click(selector: string): Promise<void> {
    const el = await this.waitForElement(selector);
    logger.info(`Clicking element: ${selector}`);
    await el.click();
  }

  async type(selector: string, text: string): Promise<void> {
    const el = await this.waitForElement(selector);
    logger.info(`Typing "${text}" into element: ${selector}`);
    await el.setValue(text);
  }

  async getText(selector: string): Promise<string> {
    const el = await this.waitForElement(selector);
    const text = await el.getText();
    logger.info(`Retrieved text "${text}" from element: ${selector}`);
    return text;
  }

  /**
   * FIX 2 — Element disabled state race condition (TC_AUTH_035, TC_FORM_035,
   * TC_CRUD_035, TC_VAL_035, TC_REGRESS_035):
   * Use waitUntil() with polling instead of bare isEnabled() to eliminate timing races.
   */
  async assertEnabled(selector: string, timeout: number = 8000): Promise<void> {
    logger.info(`Asserting element is enabled (with sync wait): ${selector}`);
    await this.driver.waitUntil(
      async () => {
        try {
          const el = await this.driver.$(selector);
          return await el.isEnabled();
        } catch {
          return false;
        }
      },
      { timeout, interval: 200,
        timeoutMsg: `Element ${selector} was not enabled within ${timeout}ms` }
    );
  }

  /**
   * FIX 3 — TC_FORM_008: Submit button must be disabled when required field is empty.
   * clearAndAssertDisabled() clears the field and waits for the submit button to become disabled.
   */
  async clearAndAssertDisabled(fieldSelector: string, submitSelector: string, timeout: number = 5000): Promise<void> {
    logger.info(`Clearing field ${fieldSelector} and asserting ${submitSelector} becomes disabled`);
    const field = await this.driver.$(fieldSelector);
    await field.clearValue();
    await this.driver.waitUntil(
      async () => {
        try {
          const btn = await this.driver.$(submitSelector);
          return !(await btn.isEnabled());
        } catch {
          return false;
        }
      },
      { timeout, interval: 150,
        timeoutMsg: `Submit button ${submitSelector} did not become disabled after clearing required field within ${timeout}ms` }
    );
    logger.info(`Submit button correctly disabled after clearing required field.`);
  }
}
