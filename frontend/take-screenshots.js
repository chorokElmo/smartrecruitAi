const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = 'C:\\Users\\Chourouk\\Desktop\\project\\screenshots';
const BASE = 'http://localhost:3000';

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForNoSpinner(page, timeout = 10000) {
  try {
    await page.waitForFunction(() => {
      const spinners = document.querySelectorAll('.animate-spin');
      return spinners.length === 0;
    }, { timeout });
  } catch (_) {}
  // Extra buffer after spinner gone
  await new Promise(r => setTimeout(r, 500));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();

  // ── Public pages ──────────────────────────────────────────────────
  console.log('Capturing 01_landing_hero...');
  await page.goto(BASE + '/', { waitUntil: 'networkidle0', timeout: 20000 });
  await wait(3000);
  await page.screenshot({ path: path.join(OUT, '01_landing_hero.png') });

  console.log('Capturing 02_landing_stats...');
  await page.evaluate(() => window.scrollTo(0, 900));
  await wait(1000);
  await page.screenshot({ path: path.join(OUT, '02_landing_stats.png') });

  console.log('Capturing 03_landing_features...');
  await page.evaluate(() => window.scrollTo(0, 2800));
  await wait(1000);
  await page.screenshot({ path: path.join(OUT, '03_landing_features.png') });

  console.log('Capturing 04_landing_howitworks...');
  await page.evaluate(() => window.scrollTo(0, 4500));
  await wait(1000);
  await page.screenshot({ path: path.join(OUT, '04_landing_howitworks.png') });

  console.log('Capturing 05_login...');
  await page.goto(BASE + '/login', { waitUntil: 'networkidle0' });
  await wait(2000);
  await page.screenshot({ path: path.join(OUT, '05_login.png') });

  console.log('Capturing 06_register...');
  await page.goto(BASE + '/register', { waitUntil: 'networkidle0' });
  await wait(2000);
  await page.screenshot({ path: path.join(OUT, '06_register.png') });

  // ── Login and capture token ────────────────────────────────────────
  console.log('Logging in...');
  await page.goto(BASE + '/login', { waitUntil: 'networkidle0' });
  await wait(2000);

  await page.type('input[type="email"]', 'demo@smartrecruit.ai');
  await page.type('input[type="password"]', 'Demo1234!');
  await page.click('button[type="submit"]');

  // Wait until redirected to dashboard
  await page.waitForFunction(() => window.location.pathname.includes('/dashboard'), { timeout: 15000 });
  await wait(4000);
  await waitForNoSpinner(page);

  const token = await page.evaluate(() => localStorage.getItem('access_token'));
  if (!token) {
    console.error('ERROR: No token found after login!');
    await browser.close();
    process.exit(1);
  }
  console.log('Login successful.');

  // ── Dashboard pages ────────────────────────────────────────────────
  const dashPages = [
    { name: '07_dashboard', url: '/dashboard', waitMs: 5000 },
    { name: '08_jobs', url: '/jobs', waitMs: 6000 },
    { name: '09_cv', url: '/cv', waitMs: 5000 },
    { name: '10_cv_builder', url: '/cv/builder', waitMs: 5000 },
    { name: '11_profile', url: '/profile', waitMs: 5000 },
    { name: '12_applications', url: '/applications', waitMs: 4000 },
    { name: '13_saved_jobs', url: '/saved', waitMs: 4000 },
    { name: '14_notifications', url: '/notifications', waitMs: 4000 },
    { name: '15_settings', url: '/settings', waitMs: 6000 },
    { name: '16_help', url: '/help', waitMs: 4000 },
  ];

  for (const p of dashPages) {
    console.log(`Capturing ${p.name}...`);
    await page.goto(BASE + p.url, { waitUntil: 'networkidle0', timeout: 20000 });
    await wait(p.waitMs);
    await waitForNoSpinner(page);
    await page.screenshot({ path: path.join(OUT, p.name + '.png') });
  }

  await browser.close();
  console.log(`\nDone! Screenshots saved to:\n${OUT}`);
})();
