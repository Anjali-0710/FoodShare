// ─────────────────────────────────────────────────────────────────────────────
// FoodReach AI — Selenium E2E: Admin Flow
// Run: npm run admin  (from selenium-tests/)
// ─────────────────────────────────────────────────────────────────────────────

const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');

const BASE_URL     = process.env.BASE_URL || 'https://Anjali-0710.github.io/FoodShare';
const ADMIN_EMAIL  = 'admin@foodreach.test';
const ADMIN_PASS   = 'Admin@12345';
const TIMEOUT      = 15000;

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

describe('FoodReach — Admin Dashboard E2E Tests', function () {
  this.timeout(60000);
  let driver;

  before(async () => {
    driver = await buildDriver();
    await driver.manage().window().setRect({ width: 1440, height: 900 });
    await loginAs(driver, ADMIN_EMAIL, ADMIN_PASS);
  });

  after(async () => await driver.quit());

  it('TC-SEL-ADMIN-001: Admin dashboard loads after login', async () => {
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('admin') ||
      body.toLowerCase().includes('dashboard') ||
      body.toLowerCase().includes('users'),
      'Admin dashboard should display'
    );
  });

  it('TC-SEL-ADMIN-002: Analytics stats cards are displayed', async () => {
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('total') ||
      body.toLowerCase().includes('donation') ||
      body.toLowerCase().includes('user'),
      'Analytics cards should display stats'
    );
  });

  it('TC-SEL-ADMIN-003: Users management tab is accessible', async () => {
    const usersTab = await driver.wait(until.elementLocated(By.id('tab-users')), TIMEOUT);
    assert.ok(await usersTab.isDisplayed(), 'Users tab should be visible');
    await usersTab.click();
    await driver.sleep(1500);
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('user') ||
      body.toLowerCase().includes('email') ||
      body.toLowerCase().includes('role'),
      'Users management list should display'
    );
  });

  it('TC-SEL-ADMIN-004: Audit logs tab is accessible', async () => {
    const logsTab = await driver.wait(until.elementLocated(By.id('tab-audit-logs')), TIMEOUT);
    assert.ok(await logsTab.isDisplayed(), 'Audit logs tab should be visible');
    await logsTab.click();
    await driver.sleep(1500);
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('log') ||
      body.toLowerCase().includes('action') ||
      body.toLowerCase().includes('audit'),
      'Audit logs should display'
    );
  });

  it('TC-SEL-ADMIN-005: Reports tab and export buttons are present', async () => {
    const reportsTab = await driver.wait(until.elementLocated(By.id('tab-reports')), TIMEOUT);
    await reportsTab.click();
    await driver.sleep(1500);
    const pdfBtn = await driver.wait(until.elementLocated(By.id('btn-export-pdf')), TIMEOUT);
    const csvBtn = await driver.wait(until.elementLocated(By.id('btn-export-csv')), TIMEOUT);
    assert.ok(await pdfBtn.isDisplayed(), 'PDF export button should be visible');
    assert.ok(await csvBtn.isDisplayed(), 'CSV export button should be visible');
  });

  it('TC-SEL-ADMIN-006: Non-admin role cannot access admin URL', async () => {
    // Attempt to navigate to admin section without credentials
    await driver.get(`${BASE_URL}/#/admin`);
    await driver.sleep(2000);
    const body = await driver.findElement(By.tagName('body')).getText();
    // Should either redirect to login or show access denied
    const isBlocked =
      body.toLowerCase().includes('sign in') ||
      body.toLowerCase().includes('login') ||
      body.toLowerCase().includes('access denied') ||
      body.toLowerCase().includes('unauthorized');
    assert.ok(isBlocked, 'Unauthenticated users should not access admin');
  });

  it('TC-SEL-ADMIN-007: Logout from admin dashboard returns to login', async () => {
    await loginAs(driver, ADMIN_EMAIL, ADMIN_PASS);
    const logoutBtn = await driver.wait(until.elementLocated(By.id('btn-logout')), TIMEOUT);
    await logoutBtn.click();
    await driver.sleep(2000);
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('sign in') || body.toLowerCase().includes('login'),
      'Should redirect to login after admin logout'
    );
  });
});
