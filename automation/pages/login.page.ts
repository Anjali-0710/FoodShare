import { BasePage } from './base.page';
import { logger } from '../utils/logger';

export class LoginPage extends BasePage {
  private get emailInput() { return 'id=input-email'; }
  private get passwordInput() { return 'id=input-password'; }
  private get submitButton() { return 'id=btn-login-submit'; }
  private get roleSelector() { return 'id=selector-role'; }
  private get errorMessage() { return 'id=text-login-error'; }
  private get otpInput() { return 'id=input-otp'; }
  private get otpSubmitButton() { return 'id=btn-otp-submit'; }

  async login(email: string, password: string, role: string): Promise<void> {
    await this.type(this.emailInput, email);
    await this.type(this.passwordInput, password);
    await this.click(`${this.roleSelector}-${role}`);
    await this.click(this.submitButton);
  }

  async getLoginError(): Promise<string> {
    return await this.getText(this.errorMessage);
  }

  /**
   * FIX 1 — TC_AUTH_010 (OTP Rate Limiting / 429 Limit Exceeded):
   * Root Cause: Back-to-back OTP requests triggered HTTP 429 throttle responses.
   * Fix: exponential back-off retries (500ms → 1000ms → 2000ms) before each attempt.
   * The test now waits progressively longer before retrying, staying within rate-limit windows.
   */
  async verifyOtpWithRetry(otp: string, maxRetries: number = 3): Promise<void> {
    const delays = [500, 1000, 2000];
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        logger.info(`OTP verification attempt ${attempt + 1}/${maxRetries}`);
        await this.type(this.otpInput, otp);
        await this.click(this.otpSubmitButton);
        logger.info('OTP verification succeeded.');
        return;
      } catch (err: any) {
        if (err.message?.includes('429') || err.message?.includes('Limit Exceeded')) {
          const delay = delays[attempt] ?? 2000;
          logger.info(`Rate limit hit. Waiting ${delay}ms before retry ${attempt + 2}...`);
          await this.driver.pause(delay);
        } else {
          throw err; // Non-rate-limit errors propagate immediately
        }
      }
    }
    throw new Error(`OTP verification failed after ${maxRetries} retries (rate limit not resolved)`);
  }
}
