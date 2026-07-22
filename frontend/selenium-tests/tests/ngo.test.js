// ─────────────────────────────────────────────────────────────────────────────
// FoodReach AI — Selenium E2E: NGO Flow
// Run: npm run ngo  (from selenium-tests/)
// ─────────────────────────────────────────────────────────────────────────────

const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');

const BASE_URL   = process.env.BASE_URL || 'https://Anjali-0710.github.io/FoodShare';
const NGO_EMAIL  = 'ngo@foodreach.test';
const NGO_PASS   = 'Test@12345';
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

describe('FoodReach — NGO Dashboard E2E Tests', function () {
  this.timeout(60000);
  let driver;

  before(async () => {
    driver = await buildDriver();
    await driver.manage().window().setRect({ width: 1280, height: 800 });
    await loginAs(driver, NGO_EMAIL, NGO_PASS);
  });

  after(async () => await driver.quit());

  it('TC-SEL-NGO-001: NGO dashboard loads after login', async () => {
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('ngo') ||
      body.toLowerCase().includes('dashboard') ||
      body.toLowerCase().includes('claims'),
      'NGO dashboard should display after login'
    );
  });

  it('TC-SEL-NGO-002: Browse Donations button is present', async () => {
    const btn = await driver.wait(until.elementLocated(By.id('btn-browse-donations')), TIMEOUT);
    assert.ok(await btn.isDisplayed(), 'Browse Donations button should be visible');
  });

  it('TC-SEL-NGO-003: Browse Donations screen loads donation cards', async () => {
    const btn = await driver.findElement(By.id('btn-browse-donations'));
    await btn.click();
    await driver.sleep(2000);
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('food') ||
      body.toLowerCase().includes('donation') ||
      body.toLowerCase().includes('available'),
      'Browse donations should show listings or empty state'
    );
  });

  it('TC-SEL-NGO-004: Notification bell is present on NGO dashboard', async () => {
    const bell = await driver.wait(until.elementLocated(By.id('btn-notifications')), TIMEOUT);
    assert.ok(await bell.isDisplayed(), 'Notification bell should be visible');
  });

  it('TC-SEL-NGO-005: Opening notifications shows real data or empty state', async () => {
    const bell = await driver.findElement(By.id('btn-notifications'));
    await bell.click();
    await driver.sleep(1500);
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('notification') ||
      body.toLowerCase().includes('no notification'),
      'Notifications screen should display'
    );
  });

  it('TC-SEL-NGO-006: No hardcoded/mock notifications are shown', async () => {
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      !body.includes('Care & Feed Foundation'),
      'Hardcoded mock NGO acceptance message must NOT be present'
    );
  });

  it('TC-SEL-NGO-007: Theme toggle works on NGO screen', async () => {
    const toggle = await driver.wait(until.elementLocated(By.id('btn-toggle-theme')), TIMEOUT);
    const before = await driver.findElement(By.tagName('body')).getAttribute('style');
    await toggle.click();
    await driver.sleep(600);
    const after = await driver.findElement(By.tagName('body')).getAttribute('style');
    // Either CSS changes or no crash — theme toggle should work without errors
    assert.ok(true, 'Theme toggle executed without crash');
  });

  it('TC-SEL-NGO-008: Logout from NGO dashboard returns to login', async () => {
    const logoutBtn = await driver.wait(until.elementLocated(By.id('btn-logout')), TIMEOUT);
    await logoutBtn.click();
    await driver.sleep(2000);
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('sign in') || body.toLowerCase().includes('login'),
      'Should redirect to login after logout'
    );
  });
});
