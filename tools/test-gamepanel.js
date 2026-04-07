import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
mkdirSync('tools/test-screenshots', { recursive: true })

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] })
const page = await browser.newPage()
await page.setViewportSize({ width: 1280, height: 720 })

const errs = []
page.on('pageerror', e => errs.push(e.message))
page.on('console',   m => { if (m.type() === 'error') errs.push(m.text()) })

await page.goto('http://localhost:5177')
await page.waitForFunction(() => document.getElementById('loading')?.classList.contains('hidden'), { timeout: 15000 })
await page.waitForTimeout(1000)
await page.screenshot({ path: 'tools/test-screenshots/gp-00-loaded.png' })
console.log('Game loaded')

// Test I → inventory tab
await page.keyboard.press('i')
await page.waitForTimeout(400)
await page.screenshot({ path: 'tools/test-screenshots/gp-01-inventory.png' })
const panelVisible = await page.$eval('#game-panel', el => el.style.display !== 'none').catch(() => false)
console.log('Panel visible on I:', panelVisible)

// Test E → equipment tab
await page.keyboard.press('e')
await page.waitForTimeout(350)
await page.screenshot({ path: 'tools/test-screenshots/gp-02-equipment.png' })

// Test Tab → skills tab
await page.keyboard.press('Tab')
await page.waitForTimeout(350)
await page.screenshot({ path: 'tools/test-screenshots/gp-03-skills.png' })

// Test Z → attunements tab
await page.keyboard.press('z')
await page.waitForTimeout(350)
await page.screenshot({ path: 'tools/test-screenshots/gp-04-attunements.png' })

// Close with Z again
await page.keyboard.press('z')
await page.waitForTimeout(300)
const closed = await page.$eval('#game-panel', el => el.style.display === 'none').catch(() => true)
console.log('Panel closed on second Z:', closed)

if (errs.length) {
  console.log(`\nBrowser errors (${errs.length}):`)
  errs.forEach(e => console.log(' ', e.slice(0, 160)))
} else {
  console.log('No browser errors')
}

await browser.close()
