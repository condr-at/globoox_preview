import { chromium } from 'playwright';

const context = await chromium.launchPersistentContext('.playwright-vercel-profile', { headless: false, slowMo: 40 });
const page = context.pages()[0] || await context.newPage();

const events = [];
const start = Date.now();
function t() {
  const d = (Date.now() - start) + 'ms';
  return d.length < 7 ? (' '.repeat(7 - d.length) + d) : d;
}

page.on('request', (req) => {
  const u = req.url();
  if (u.includes('reading-position') || u.includes('/api/books') || u.includes('/api/sync/status')) {
    events.push(t() + ' REQ ' + req.method() + ' ' + u + ' @ ' + page.url());
  }
});
page.on('response', (res) => {
  const u = res.url();
  if (u.includes('reading-position') || u.includes('/api/books') || u.includes('/api/sync/status')) {
    events.push(t() + ' RES ' + res.status() + ' ' + u + ' @ ' + page.url());
  }
});

await page.goto('http://localhost:3000/my-books', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);

events.push(t() + ' ---- CLICK SETTINGS ----');
const settingsLink = page.getByRole('link', { name: /Settings/i });
if (await settingsLink.count()) {
  await settingsLink.click();
  await page.waitForTimeout(7000);
}

events.push(t() + ' ---- CLICK MY BOOKS ----');
const myBooksLink = page.getByRole('link', { name: /My Books/i });
if (await myBooksLink.count()) {
  await myBooksLink.click();
  await page.waitForTimeout(7000);
}

console.log('FINAL_URL ' + page.url());
for (const e of events) console.log(e);

await context.close();
