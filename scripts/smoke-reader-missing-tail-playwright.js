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
      requests.push({ method: request.method(), url, ts: Date.now() })
    }
  })

  await page.goto(`${baseUrl}/reader/${bookId}`, { waitUntil: 'networkidle', timeout: 120000 })
  await page.waitForSelector('h1', { timeout: 30000 })

  await page.locator('header button').last().click()
  await page.getByRole('button', { name: 'Chapters' }).click()
  await page.getByRole('button', { name: /A World of Values/ }).click()
  await wait(2500)

  let reachedFootnotes = false
  for (let i = 0; i < 25; i += 1) {
    if (await page.getByText('Footnotes').isVisible().catch(() => false)) {
      reachedFootnotes = true
      break
    }
    await page.keyboard.press('ArrowRight')
    await wait(350)
  }

  const footnotesVisibleBeforeSwitch = await page.getByText('Footnotes').isVisible().catch(() => false)

  const langButton = page.getByRole('button', { name: /EN|FR|ES|DE|RU/ }).first()
  await langButton.click()
  await page.getByRole('button', { name: 'Русский' }).click()
  await wait(3000)

  const blurredCountAfterSwitch = await page.locator('.blur-\\[3px\\]').count()
  const translatingLabelVisibleAfterSwitch = await page.getByText('Translating...').isVisible().catch(() => false)

  await wait(5000)

  const blurredCountAfterExtraWait = await page.locator('.blur-\\[3px\\]').count()
  const translatingLabelVisibleAfterExtraWait = await page.getByText('Translating...').isVisible().catch(() => false)

  console.log(JSON.stringify({
    title: await page.locator('header h1').textContent(),
    reachedFootnotes,
    footnotesVisibleBeforeSwitch,
    blurredCountAfterSwitch,
    translatingLabelVisibleAfterSwitch,
    blurredCountAfterExtraWait,
    translatingLabelVisibleAfterExtraWait,
    apiSummary: {
      content: requests.filter((r) => r.url.includes('/content')).length,
      translate: requests.filter((r) => r.url.includes('/translate') && !r.url.includes('translate-status')).length,
      blocksText: requests.filter((r) => r.url.includes('/blocks/text')).length,
    },
    requestSample: requests.slice(0, 60),
  }, null, 2))

  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
