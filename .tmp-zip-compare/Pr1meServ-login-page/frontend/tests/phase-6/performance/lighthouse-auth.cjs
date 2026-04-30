/**
 * @param {import('puppeteer').Browser} browser
 * @param {{url: string, options: any}} context
 */
module.exports = async (browser, context) => {
  const page = await browser.newPage();
  
  try {
    const loginUrl = new URL('/login', context.url).href;
    console.log(`Navigating to ${loginUrl}`);
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });

    console.log('Waiting for email input...');
    await page.waitForSelector('input[name="email"]', { timeout: 30000 });
    await page.type('input[name="email"]', 'admin@a1prime.com');
    
    console.log('Waiting for password input...');
    await page.waitForSelector('input[name="password"]');
    await page.type('input[name="password"]', 'Admin123!');
    
    let attempts = 0;
    const maxAttempts = 3;
    let success = false;

    while (attempts < maxAttempts && !success) {
      attempts++;
      console.log(`Clicking submit... Attempt ${attempts}`);
      try {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
          page.click('button[type="submit"]'),
        ]);
        success = true;
        console.log('Logged in successfully!');
      } catch (navError) {
        console.warn(`Attempt ${attempts} failed:`, navError.message);
        if (attempts >= maxAttempts) {
          throw new Error('Max login attempts reached');
        }
        console.log('Waiting 2 seconds before retrying...');
        await new Promise((r) => setTimeout(r, 2000));
        // Ensure inputs are filled in case they cleared or we are still on the page
        const emailVal = await page.$eval('input[name="email"]', el => el.value).catch(() => '');
        if (!emailVal) {
          await page.type('input[name="email"]', 'admin@a1prime.com');
          await page.type('input[name="password"]', 'Admin123!');
        }
      }
    }
  } catch (error) {
    console.error('Puppeteer script failed:', error);
    throw error;
  } finally {
    await page.close();
  }
};
