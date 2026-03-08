const { chromium } = require('playwright')

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000'
  const bookId = process.env.BOOK_ID || 'c6cadd89-ee56-4c9f-89be-e10d5404daa5'
  const chapterId = process.env.CHAPTER_ID || '2309fffa-0af5-40d4-a601-114b134dfb2b'
  const blockId = process.env.BLOCK_ID || 'd9785355-06a7-41df-84b1-5a4aaff9423c'
  const blockPosition = Number(process.env.BLOCK_POSITION || '159')
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

  const errors = []
  page.on('pageerror', (error) => {
    errors.push(String(error))
  })

  await page.addInitScript(({ bookId, chapterId, blockId, blockPosition }) => {
    const payload = {
      state: {
        settings: { fontSize: 16, theme: 'dark', language: 'en' },
        perBookLanguages: { [bookId]: 'en' },
        progress: {},
        readingAnchors: {
          [bookId]: {
            chapterId,
            blockId,
            blockPosition,
            sentenceIndex: 0,
            updatedAt: new Date().toISOString(),
          },
        },
        syncVersions: { library: null, progress: null, settings: null },
      },
      version: 0,
    }
    window.localStorage.setItem('globoox-preview-storage', JSON.stringify(payload))
  }, { bookId, chapterId, blockId, blockPosition })

  await page.goto(`${baseUrl}/reader/${bookId}`, { waitUntil: 'networkidle', timeout: 120000 })
  await page.waitForSelector('h1', { timeout: 30000 })
  await wait(2000)

  const langButton = page.getByRole('button', { name: /EN|FR|ES|DE|RU/ }).first()
  await langButton.click()
  await page.getByRole('button', { name: 'Español' }).click()

  await wait(3000)

  const blurredCountAfterSwitch = await page.locator('.blur-\\[3px\\]').count()
  const translatingLabelVisibleAfterSwitch = await page.getByText('Translating...').isVisible().catch(() => false)

  await wait(35000)

  const blurredCountAfterWait = await page.locator('.blur-\\[3px\\]').count()
  const translatingLabelVisibleAfterWait = await page.getByText('Translating...').isVisible().catch(() => false)

  const apiSummary = {
    content: requests.filter((r) => r.url.includes('/content')).length,
    translate: requests.filter((r) => r.url.includes('/translate') && !r.url.includes('translate-status')).length,
    blocksText: requests.filter((r) => r.url.includes('/blocks/text')).length,
  }

  console.log(JSON.stringify({
    title: await page.locator('h1').textContent(),
    chapterId,
    anchoredBlockId: blockId,
    blurredCountAfterSwitch,
    translatingLabelVisibleAfterSwitch,
    blurredCountAfterWait,
    translatingLabelVisibleAfterWait,
    apiSummary,
    requestSample: requests.slice(0, 50),
    errors,
  }, null, 2))

  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
