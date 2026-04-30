/* global console */

const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    const loginUrl = 'http://127.0.0.1:3002/login';
    console.log(`Navigating to ${loginUrl}`);
    await page.goto(loginUrl, { waitUntil: 'networkidle0' });

    console.log('Waiting for email input...');
    await page.waitForSelector('input[placeholder="agent@a1prime.com"]', { timeout: 15000 });
    await page.type('input[placeholder="agent@a1prime.com"]', 'admin@a1prime.com');
    
    console.log('Waiting for password input...');
    await page.waitForSelector('input[type="password"]');
    await page.type('input[type="password"]', 'Admin123!');
    
    console.log('Clicking submit...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
      page.click('button[type="submit"]'),
    ]);
    console.log('Logged in successfully!');
  } catch (error) {
    console.error('Puppeteer script failed:', error);
  } finally {
    await browser.close();
  }
})();
