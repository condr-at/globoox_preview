const { chromium } = require('playwright')

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000'
  const bookId = process.env.BOOK_ID || 'c6cadd89-ee56-4c9f-89be-e10d5404daa5'
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const requests = []
  page.on('request', (request) => {
    const url = request.url()
    if (url.includes('/api/chapters/') || url.includes('/api/books/')) {
      requests.push({ method: request.method(), url })
    }
  })

  const errors = []
  page.on('pageerror', (error) => {
    errors.push(String(error))
  })

  await page.goto(`${baseUrl}/reader/${bookId}`, { waitUntil: 'networkidle', timeout: 120000 })
  await page.waitForSelector('h1', { timeout: 30000 })

  const title = await page.locator('h1').textContent()

  const actionsButton = page.locator('header button').last()
  await actionsButton.click()
  await page.getByRole('button', { name: 'Chapters' }).click()
  await page.getByRole('button', { name: /A World of Values/ }).click()
  await wait(2000)

  const langButton = page.getByRole('button', { name: /EN|FR|ES|DE|RU/ }).first()
  await langButton.click()
  await page.getByRole('button', { name: 'Español' }).click()

  await wait(2000)

  const blurredCountAfterSwitch = await page.locator('.blur-\\[3px\\]').count()
  const translatingLabelVisibleAfterSwitch = await page.getByText('Translating...').isVisible().catch(() => false)

  await page.getByRole('link').first().click()
  await page.waitForURL(`${baseUrl}/library`, { timeout: 30000 })

  const continueReadingVisible = await page.getByText('Continue Reading').isVisible().catch(() => false)

  await page.goto(`${baseUrl}/reader/${bookId}`, { waitUntil: 'networkidle', timeout: 120000 })
  await wait(2000)

  const blurredCountAfterReturn = await page.locator('.blur-\\[3px\\]').count()
  const translatingLabelVisibleAfterReturn = await page.getByText('Translating...').isVisible().catch(() => false)

  const apiSummary = {
    content: requests.filter((r) => r.url.includes('/content')).length,
    translate: requests.filter((r) => r.url.includes('/translate') && !r.url.includes('translate-status')).length,
    blocksText: requests.filter((r) => r.url.includes('/blocks/text')).length,
    readingPosition: requests.filter((r) => r.url.includes('/reading-position')).length,
  }

  console.log(JSON.stringify({
    title,
    blurredCountAfterSwitch,
    blurredCountAfterReturn,
    translatingLabelVisibleAfterSwitch,
    translatingLabelVisibleAfterReturn,
    continueReadingVisible,
    apiSummary,
    requestSample: requests.slice(0, 40),
    errors,
  }, null, 2))

  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
