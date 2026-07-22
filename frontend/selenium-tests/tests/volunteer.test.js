// ─────────────────────────────────────────────────────────────────────────────
// FoodReach AI — Selenium E2E: Volunteer Flow
// Run: npm run volunteer  (from selenium-tests/)
// ─────────────────────────────────────────────────────────────────────────────

const { Builder, By, until } = require('selenium-webdriver');
const assert = require('assert');

const BASE_URL    = 'https://YOUR_USERNAME.github.io/foodshare-ai';
const VOL_EMAIL   = 'volunteer@foodreach.test';
const VOL_PASS    = 'Test@12345';
const TIMEOUT     = 15000;

async function buildDriver() {
  return new Builder().forBrowser('chrome').build();
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

describe('FoodReach — Volunteer Dashboard E2E Tests', function () {
  this.timeout(60000);
  let driver;

  before(async () => {
    driver = await buildDriver();
    await driver.manage().window().setRect({ width: 1280, height: 800 });
    await loginAs(driver, VOL_EMAIL, VOL_PASS);
  });

  after(async () => await driver.quit());

  it('TC-SEL-VOL-001: Volunteer dashboard loads after login', async () => {
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('volunteer') ||
      body.toLowerCase().includes('pickup') ||
      body.toLowerCase().includes('dashboard'),
      'Volunteer dashboard should display'
    );
  });

  it('TC-SEL-VOL-002: Score card is displayed on volunteer dashboard', async () => {
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('score') ||
      body.toLowerCase().includes('karma') ||
      body.toLowerCase().includes('points'),
      'Karma score should be visible on volunteer dashboard'
    );
  });

  it('TC-SEL-VOL-003: Leaderboard button navigates to leaderboard', async () => {
    const btn = await driver.wait(until.elementLocated(By.id('btn-leaderboard')), TIMEOUT);
    await btn.click();
    await driver.sleep(1500);
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('leaderboard') ||
      body.toLowerCase().includes('rank'),
      'Leaderboard screen should display'
    );
  });

  it('TC-SEL-VOL-004: Notification bell is present on volunteer dashboard', async () => {
    const bell = await driver.wait(until.elementLocated(By.id('btn-notifications')), TIMEOUT);
    assert.ok(await bell.isDisplayed(), 'Notification bell should be visible');
  });

  it('TC-SEL-VOL-005: Available pickups list loads', async () => {
    const btn = await driver.wait(until.elementLocated(By.id('btn-available-pickups')), TIMEOUT);
    await btn.click();
    await driver.sleep(2000);
    const body = await driver.findElement(By.tagName('body')).getText();
    assert.ok(
      body.toLowerCase().includes('pickup') ||
      body.toLowerCase().includes('available') ||
      body.toLowerCase().includes('no pickups'),
      'Available pickups list or empty state should display'
    );
  });

  it('TC-SEL-VOL-006: Logout from volunteer dashboard returns to login', async () => {
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
