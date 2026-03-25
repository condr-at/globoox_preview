import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, slowMo: 35 });
const context = await browser.newContext();
const page = await context.newPage();

const start = Date.now();
function t() {
  const d = (Date.now() - start) + 'ms';
  return d.length < 7 ? (' '.repeat(7 - d.length) + d) : d;
}
const events = [];

page.on('request', (req) => {
  const u = req.url();
  if (u.includes('reading-position') || u.includes('/api/books?status=') || u.includes('/api/sync/status')) {
    events.push(t() + ' REQ ' + req.method() + ' ' + u + ' @ ' + page.url());
  }
});
page.on('response', (res) => {
  const u = res.url();
  if (u.includes('reading-position') || u.includes('/api/books?status=') || u.includes('/api/sync/status')) {
    events.push(t() + ' RES ' + res.status() + ' ' + u + ' @ ' + page.url());
  }
});

await page.goto('http://localhost:3000/auth', { waitUntil: 'domcontentloaded' });
await page.fill('#email', 'futurgate@mail.ru');
await page.fill('#password', '12345678');
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL(/\/my-books/, { timeout: 30000 });
await page.waitForTimeout(9000);

events.push(t() + ' ---- CLICK SETTINGS ----');
await page.getByRole('link', { name: /Settings/i }).click();
await page.waitForURL(/\/settings/, { timeout: 15000 });
await page.waitForTimeout(7000);

events.push(t() + ' ---- CLICK MY BOOKS ----');
await page.getByRole('link', { name: /My Books/i }).click();
await page.waitForURL(/\/my-books/, { timeout: 15000 });
await page.waitForTimeout(7000);

console.log('FINAL_URL ' + page.url());
for (const e of events) console.log(e);

const rpReq = events.filter((e) => e.includes(' REQ ') && e.includes('reading-position'));
console.log('READING_POSITION_REQ_COUNT ' + rpReq.length);

await context.close();
await browser.close();
