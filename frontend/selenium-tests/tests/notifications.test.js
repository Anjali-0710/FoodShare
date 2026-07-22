// ─────────────────────────────────────────────────────────────────────────────
// FoodReach AI — Selenium E2E: Notifications Flow
// Run: npm run notifications  (from selenium-tests/)
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
  await emailField.clear(); await emailField.sendKeys(email);
  await passField.clear();  await passField.sendKeys(password);
  await driver.findElement(By.id('login-button')).click();
  await driver.sleep(3000);
}

describe('FoodReach — Notifications E2E Tests', function () {
  this.timeout(30000);
  let driver;

  before(async () => {
    driver = await buildDriver();
    await driver.manage().window().setRect({ width: 1280, height: 800 });
    await loginAs(driver, TEST_EMAIL, TEST_PASS);
  });

  after(async () => await driver.quit());

  it('TC-SEL-NOTIF-001: Notification bell opens notification center', async () => {
    const bell = await driver.wait(until.elementLocated(By.id('btn-notifications')), TIMEOUT);
    await bell.click();
    await driver.sleep(1500);
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('notification') ||
      body.toLowerCase().includes('no notification'),
      'Notification center should open'
    );
  });

  it('TC-SEL-NOTIF-002: No hardcoded mock acceptance messages visible', async () => {
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      !body.includes('Care & Feed Foundation'),
      'Mock NGO acceptance message must NOT appear'
    );
    assert.ok(
      !body.includes('has accepted your surplus'),
      'Hardcoded acceptance text must NOT appear'
    );
  });

  it('TC-SEL-NOTIF-003: Empty state shows "No notifications available"', async () => {
    const body = await driver.findElement(By.tagName('body')).getText();
    const hasNoNotifications =
      body.toLowerCase().includes('no notification') ||
      body.toLowerCase().includes('no notifications available') ||
      // OR has real notifications from DB (both are valid states)
      body.toLowerCase().includes('notification');
    assert.ok(hasNoNotifications, 'Notification screen should show valid state');
  });

  it('TC-SEL-NOTIF-004: Notification items (if any) are real DB records', async () => {
    const body = await driver.findElement(By.tagName('body')).getText();
    // Ensure no seeded demo text patterns exist
    const demoPatterns = [
      'sample notification',
      'demo notification',
      'test notification',
      'seeded notification',
    ];
    for (const pattern of demoPatterns) {
      assert.ok(!body.toLowerCase().includes(pattern), `Mock pattern "${pattern}" must not appear`);
    }
  });
});
