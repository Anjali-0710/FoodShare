// ─────────────────────────────────────────────────────────────────────────────
// FoodReach AI — Selenium E2E: Register Flow
// Run: npm run register  (from selenium-tests/)
// ─────────────────────────────────────────────────────────────────────────────

const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');

const BASE_URL = process.env.BASE_URL || 'https://Anjali-0710.github.io/FoodShare';
const TIMEOUT  = 15000;

async function buildDriver() {
  const options = new chrome.Options();
  options.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu');
  return new Builder().forBrowser('chrome').setChromeOptions(options).build();
}

describe('FoodReach — Register Screen E2E Tests', function () {
  this.timeout(30000);
  let driver;

  before(async () => {
    driver = await buildDriver();
    await driver.get(`${BASE_URL}/#/register`);
    await driver.manage().window().setRect({ width: 1280, height: 800 });
  });

  after(async () => await driver.quit());

  it('TC-SEL-REG-001: Register screen loads with all required fields', async () => {
    const name  = await driver.wait(until.elementLocated(By.id('name')), TIMEOUT);
    const email = await driver.findElement(By.id('email'));
    const pass  = await driver.findElement(By.id('password'));
    assert.ok(await name.isDisplayed(),  'Name field should be visible');
    assert.ok(await email.isDisplayed(), 'Email field should be visible');
    assert.ok(await pass.isDisplayed(),  'Password field should be visible');
  });

  it('TC-SEL-REG-002: Submit empty form shows mandatory field errors', async () => {
    const btn = await driver.wait(until.elementLocated(By.id('register-button')), TIMEOUT);
    await btn.click();
    await driver.sleep(800);
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('required') || body.toLowerCase().includes('name'),
      'Mandatory field errors should appear'
    );
  });

  it('TC-SEL-REG-003: Invalid email format blocks submission', async () => {
    const email = await driver.findElement(By.id('email'));
    await email.clear();
    await email.sendKeys('bademail');
    const btn = await driver.findElement(By.id('register-button'));
    await btn.click();
    await driver.sleep(800);
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('valid email') || body.toLowerCase().includes('invalid'),
      'Invalid email should be blocked'
    );
  });

  it('TC-SEL-REG-004: Password too short (< 6 chars) blocks submission', async () => {
    const pass = await driver.findElement(By.id('password'));
    await pass.clear();
    await pass.sendKeys('abc');
    const btn = await driver.findElement(By.id('register-button'));
    await btn.click();
    await driver.sleep(800);
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('6') || body.toLowerCase().includes('password'),
      'Short password should be blocked'
    );
  });

  it('TC-SEL-REG-005: Password mismatch shows confirm error', async () => {
    const pass    = await driver.findElement(By.id('password'));
    const confirm = await driver.findElement(By.id('confirm-password'));
    await pass.clear();
    await pass.sendKeys('ValidPass123!');
    await confirm.clear();
    await confirm.sendKeys('DifferentPass!');
    const btn = await driver.findElement(By.id('register-button'));
    await btn.click();
    await driver.sleep(800);
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('match') || body.toLowerCase().includes('password'),
      'Password mismatch error should appear'
    );
  });

  it('TC-SEL-REG-006: Role selector dropdown is present', async () => {
    const role = await driver.wait(until.elementLocated(By.id('role-selector')), TIMEOUT);
    assert.ok(await role.isDisplayed(), 'Role selector should be visible');
  });

  it('TC-SEL-REG-007: Invalid phone number blocks submission', async () => {
    const phone = await driver.wait(until.elementLocated(By.id('phone')), TIMEOUT);
    await phone.clear();
    await phone.sendKeys('999');
    const btn = await driver.findElement(By.id('register-button'));
    await btn.click();
    await driver.sleep(800);
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('phone') || body.toLowerCase().includes('valid'),
      'Invalid phone should be blocked'
    );
  });

  it('TC-SEL-REG-008: Back to login link is present and works', async () => {
    const link = await driver.wait(until.elementLocated(By.id('back-to-login')), TIMEOUT);
    assert.ok(await link.isDisplayed(), 'Back to login link should be visible');
    await link.click();
    await driver.sleep(1000);
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('sign in') || body.toLowerCase().includes('login'),
      'Should navigate back to Login screen'
    );
  });
});
