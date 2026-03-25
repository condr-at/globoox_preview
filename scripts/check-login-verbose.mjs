import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, slowMo: 30 });
const context = await browser.newContext();
const page = await context.newPage();

page.on('console', (msg) => console.log('BROWSER_LOG', msg.type(), msg.text()));
page.on('pageerror', (err) => console.log('PAGE_ERR', err.message));
page.on('request', (req) => {
  const u = req.url();
  if (u.includes('supabase') || u.includes('/auth') || u.includes('/api/')) {
    console.log('REQ', req.method(), u);
  }
});
page.on('response', (res) => {
  const u = res.url();
  if (u.includes('supabase') || u.includes('/auth') || u.includes('/api/')) {
    console.log('RES', res.status(), u);
  }
});

await page.goto('http://localhost:3000/auth', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

await page.fill('#email', 'futurgate@mail.ru');
await page.fill('#password', '12345678');
await page.waitForTimeout(500);

const btn = page.getByRole('button', { name: 'Sign in' });
console.log('BTN_COUNT', await btn.count());
console.log('BTN_ENABLED', await btn.isEnabled());
await btn.click();

await page.waitForTimeout(10000);
console.log('FINAL_URL', page.url());

await context.close();
await browser.close();
