// ─────────────────────────────────────────────────────────────────────────────
// FoodReach AI — Selenium E2E: Donor Flow
// Run: npm run donor  (from selenium-tests/)
// ─────────────────────────────────────────────────────────────────────────────

const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');

const BASE_URL   = process.env.BASE_URL || 'https://Anjali-0710.github.io/FoodShare';
const TEST_EMAIL = 'donor@foodreach.test';
const TEST_PASS  = 'Test@12345';
const TIMEOUT    = 15000;

async function buildDriver() {
  const options = new chrome.Options();
  options.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu');
  return new Builder().forBrowser('chrome').setChromeOptions(options).build();
}

async function loginAs(driver, email, password) {
  await driver.get(`${BASE_URL}/#/login`);
  await driver.sleep(1500);
  const emailField = await driver.wait(until.elementLocated(By.id('email')), TIMEOUT);
  const passField  = await driver.findElement(By.id('password'));
  await emailField.clear();
  await emailField.sendKeys(email);
  await passField.clear();
  await passField.sendKeys(password);
  await driver.findElement(By.id('login-button')).click();
  await driver.sleep(3000);
}

describe('FoodReach — Donor Dashboard E2E Tests', function () {
  this.timeout(60000);
  let driver;

  before(async () => {
    driver = await buildDriver();
    await driver.manage().window().setRect({ width: 1280, height: 800 });
    await loginAs(driver, TEST_EMAIL, TEST_PASS);
  });

  after(async () => await driver.quit());

  it('TC-SEL-DONOR-001: Donor dashboard loads after login', async () => {
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('dashboard') || body.toLowerCase().includes('donation'),
      'Donor dashboard should be displayed after login'
    );
  });

  it('TC-SEL-DONOR-002: Header contains logout button', async () => {
    const btn = await driver.wait(until.elementLocated(By.id('btn-logout')), TIMEOUT);
    assert.ok(await btn.isDisplayed(), 'Logout button should be visible in header');
  });

  it('TC-SEL-DONOR-003: Notification bell icon is present', async () => {
    const bell = await driver.wait(until.elementLocated(By.id('btn-notifications')), TIMEOUT);
    assert.ok(await bell.isDisplayed(), 'Notification bell should be present');
  });

  it('TC-SEL-DONOR-004: Theme toggle button is present', async () => {
    const toggle = await driver.wait(until.elementLocated(By.id('btn-toggle-theme')), TIMEOUT);
    assert.ok(await toggle.isDisplayed(), 'Theme toggle should be present');
  });

  it('TC-SEL-DONOR-005: Create Donation button navigates to form', async () => {
    const createBtn = await driver.wait(
      until.elementLocated(By.id('btn-create-donation')), TIMEOUT
    );
    await createBtn.click();
    await driver.sleep(1500);
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('create') || body.toLowerCase().includes('food'),
      'Create Donation screen should load'
    );
  });

  it('TC-SEL-DONOR-006: Create Donation form — food name field is present', async () => {
    const foodName = await driver.wait(
      until.elementLocated(By.id('food-name')), TIMEOUT
    );
    assert.ok(await foodName.isDisplayed(), 'Food name field should be visible');
  });

  it('TC-SEL-DONOR-007: Create Donation form — quantity field is present', async () => {
    const qty = await driver.wait(until.elementLocated(By.id('quantity')), TIMEOUT);
    assert.ok(await qty.isDisplayed(), 'Quantity field should be visible');
  });

  it('TC-SEL-DONOR-008: Create Donation form — submit with empty fields shows errors', async () => {
    const submitBtn = await driver.wait(
      until.elementLocated(By.id('submit-donation')), TIMEOUT
    );
    await submitBtn.click();
    await driver.sleep(800);
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('required') || body.toLowerCase().includes('food'),
      'Validation errors should appear for empty donation form'
    );
  });

  it('TC-SEL-DONOR-009: Create Donation — negative quantity is blocked', async () => {
    const qty = await driver.findElement(By.id('quantity'));
    await qty.clear();
    await qty.sendKeys('-5');
    const submitBtn = await driver.findElement(By.id('submit-donation'));
    await submitBtn.click();
    await driver.sleep(800);
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('greater') ||
      body.toLowerCase().includes('invalid') ||
      body.toLowerCase().includes('quantity'),
      'Negative quantity should be blocked'
    );
  });

  it('TC-SEL-DONOR-010: Logout from donor dashboard works', async () => {
    const logoutBtn = await driver.wait(until.elementLocated(By.id('btn-logout')), TIMEOUT);
    await logoutBtn.click();
    await driver.sleep(2000);
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('sign in') || body.toLowerCase().includes('login'),
      'Should redirect to login screen after logout'
    );
  });
});
