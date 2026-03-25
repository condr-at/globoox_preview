import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, slowMo: 50 });
const context = await browser.newContext();
const page = await context.newPage();

page.on('response', async (res) => {
  const u = res.url();
  if (u.includes('/auth/v1/token')) {
    let body = '';
    try { body = await res.text(); } catch {}
    console.log('TOKEN_RES', res.status(), u);
    console.log('TOKEN_BODY', body.slice(0, 500));
  }
});

await page.goto('http://localhost:3000/auth', { waitUntil: 'domcontentloaded' });
await page.fill('#email', 'futurgate@mail.ru');
await page.fill('#password', '12345678');
await page.getByRole('button', { name: 'Sign in' }).click();

await page.waitForTimeout(8000);
console.log('FINAL_URL', page.url());

const errors = page.locator('.text-destructive');
const count = await errors.count();
console.log('ERRORS', count);
if (count > 0) {
  console.log('ERROR_TEXT', await errors.first().innerText());
}

await context.close();
await browser.close();
