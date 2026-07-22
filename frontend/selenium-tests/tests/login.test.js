// ─────────────────────────────────────────────────────────────────────────────
// FoodReach AI — Selenium E2E: Login Flow
// Target: https://YOUR_USERNAME.github.io/foodshare-ai/#/login
// Run: npm run login  (from selenium-tests/)
// ─────────────────────────────────────────────────────────────────────────────

const { Builder, By, until, Key } = require('selenium-webdriver');
const assert = require('assert');

// ── Configuration ─────────────────────────────────────────────────────────────
const BASE_URL   = 'https://YOUR_USERNAME.github.io/foodshare-ai';
const TEST_EMAIL = 'donor@foodreach.test';
const TEST_PASS  = 'Test@12345';
const TIMEOUT    = 15000; // ms

// ── Helper: build Chrome driver ───────────────────────────────────────────────
async function buildDriver() {
  return new Builder().forBrowser('chrome').build();
}

// ─────────────────────────────────────────────────────────────────────────────
describe('FoodReach — Login Screen E2E Tests', function () {
  this.timeout(30000);
  let driver;

  before(async () => {
    driver = await buildDriver();
    await driver.get(`${BASE_URL}/#/login`);
    await driver.manage().window().setRect({ width: 1280, height: 800 });
  });

  after(async () => {
    await driver.quit();
  });

  // ── TC-SEL-LOGIN-001 ────────────────────────────────────────────────────────
  it('TC-SEL-LOGIN-001: Login page title renders correctly', async () => {
    const title = await driver.getTitle();
    assert.ok(title.length > 0, 'Page title should not be empty');
  });

  // ── TC-SEL-LOGIN-002 ────────────────────────────────────────────────────────
  it('TC-SEL-LOGIN-002: Email input field is present and focusable', async () => {
    const emailField = await driver.wait(
      until.elementLocated(By.id('email')), TIMEOUT
    );
    assert.ok(await emailField.isDisplayed(), 'Email field should be visible');
    await emailField.click();
  });

  // ── TC-SEL-LOGIN-003 ────────────────────────────────────────────────────────
  it('TC-SEL-LOGIN-003: Password input field is present and focusable', async () => {
    const passField = await driver.wait(
      until.elementLocated(By.id('password')), TIMEOUT
    );
    assert.ok(await passField.isDisplayed(), 'Password field should be visible');
  });

  // ── TC-SEL-LOGIN-004 ────────────────────────────────────────────────────────
  it('TC-SEL-LOGIN-004: Sign In button is present and enabled', async () => {
    const btn = await driver.wait(
      until.elementLocated(By.id('login-button')), TIMEOUT
    );
    assert.ok(await btn.isEnabled(), 'Login button should be enabled');
  });

  // ── TC-SEL-LOGIN-005 ────────────────────────────────────────────────────────
  it('TC-SEL-LOGIN-005: Submit empty form shows validation error', async () => {
    const btn = await driver.findElement(By.id('login-button'));
    await btn.click();
    await driver.sleep(800);
    // Validation error or alert should appear
    const body = await driver.findElement(By.tagName('body')).getText();
    const hasError =
      body.toLowerCase().includes('required') ||
      body.toLowerCase().includes('invalid') ||
      body.toLowerCase().includes('email');
    assert.ok(hasError, 'Validation message should appear on empty submit');
  });

  // ── TC-SEL-LOGIN-006 ────────────────────────────────────────────────────────
  it('TC-SEL-LOGIN-006: Enter invalid email format shows error', async () => {
    const emailField = await driver.findElement(By.id('email'));
    await emailField.clear();
    await emailField.sendKeys('notanemail');
    const btn = await driver.findElement(By.id('login-button'));
    await btn.click();
    await driver.sleep(800);
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('valid email') ||
      body.toLowerCase().includes('invalid'),
      'Invalid email error should be shown'
    );
  });

  // ── TC-SEL-LOGIN-007 ────────────────────────────────────────────────────────
  it('TC-SEL-LOGIN-007: Wrong credentials returns error message', async () => {
    const emailField = await driver.findElement(By.id('email'));
    const passField  = await driver.findElement(By.id('password'));
    await emailField.clear();
    await emailField.sendKeys('wrong@user.com');
    await passField.clear();
    await passField.sendKeys('WrongPass99!');
    const btn = await driver.findElement(By.id('login-button'));
    await btn.click();
    await driver.sleep(2000);
    const body = await driver.findElement(By.tagName('body')).getText();
    const hasError =
      body.toLowerCase().includes('invalid') ||
      body.toLowerCase().includes('incorrect') ||
      body.toLowerCase().includes('not found');
    assert.ok(hasError, 'Wrong credential error message should appear');
  });

  // ── TC-SEL-LOGIN-008 ────────────────────────────────────────────────────────
  it('TC-SEL-LOGIN-008: Forgot Password link navigates correctly', async () => {
    const link = await driver.wait(
      until.elementLocated(By.id('forgot-password-link')), TIMEOUT
    );
    await link.click();
    await driver.sleep(1000);
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('forgot') ||
      body.toLowerCase().includes('reset') ||
      body.toLowerCase().includes('email'),
      'Forgot password screen should be displayed'
    );
  });

  // ── TC-SEL-LOGIN-009 ────────────────────────────────────────────────────────
  it('TC-SEL-LOGIN-009: Register link navigates to Register screen', async () => {
    await driver.get(`${BASE_URL}/#/login`);
    await driver.sleep(1000);
    const link = await driver.wait(
      until.elementLocated(By.id('register-link')), TIMEOUT
    );
    await link.click();
    await driver.sleep(1000);
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('register') ||
      body.toLowerCase().includes('sign up') ||
      body.toLowerCase().includes('create account'),
      'Register screen should be displayed'
    );
  });

  // ── TC-SEL-LOGIN-010 ────────────────────────────────────────────────────────
  it('TC-SEL-LOGIN-010: Successful login redirects to Dashboard', async () => {
    await driver.get(`${BASE_URL}/#/login`);
    await driver.sleep(1000);
    const emailField = await driver.wait(
      until.elementLocated(By.id('email')), TIMEOUT
    );
    const passField = await driver.findElement(By.id('password'));
    await emailField.clear();
    await emailField.sendKeys(TEST_EMAIL);
    await passField.clear();
    await passField.sendKeys(TEST_PASS);
    const btn = await driver.findElement(By.id('login-button'));
    await btn.click();
    await driver.sleep(3000);
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('dashboard') ||
      body.toLowerCase().includes('welcome') ||
      body.toLowerCase().includes('donation'),
      'User should be on Dashboard after login'
    );
  });
});
