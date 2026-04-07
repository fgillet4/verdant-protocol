/**
 * game-test.js — Playwright-based test runner for Verdant Protocol.
 * Usage:  node tools/game-test.js [suite]
 * Suites: all | hud | movement | combat | skills | settings | minimap | chat
 *
 * Requires the Vite dev server already running on http://localhost:5173
 * Screenshots written to tools/test-screenshots/
 */
import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'fs'

const URL       = process.env.VP_URL ?? 'http://localhost:5173'
const SS_DIR    = 'tools/test-screenshots'
const SUITE     = process.argv[2] ?? 'all'
const LOAD_WAIT = 12_000   // ms to wait for world to load

mkdirSync(SS_DIR, { recursive: true })

// ── Utilities ────────────────────────────────────────────────────────────────

let page, browser
const results = []

async function shot(name) {
  const file = `${SS_DIR}/${name}.png`
  await page.screenshot({ path: file, fullPage: false })
  return file
}

async function vp(expr) {
  return page.evaluate(expr)
}

function pass(name, detail = '') {
  console.log(`  ✓  ${name}${detail ? '  →  ' + detail : ''}`)
  results.push({ name, ok: true, detail })
}

function fail(name, detail = '') {
  console.error(`  ✗  ${name}${detail ? '  →  ' + detail : ''}`)
  results.push({ name, ok: false, detail })
}

async function check(name, condition, detail = '') {
  try {
    const ok = typeof condition === 'function' ? await condition() : condition
    ok ? pass(name, detail) : fail(name, detail || 'assertion failed')
  } catch (e) {
    fail(name, e.message)
  }
}

async function waitLoad() {
  // Wait until #loading has .hidden class (boot complete)
  await page.waitForFunction(
    () => document.getElementById('loading')?.classList.contains('hidden'),
    { timeout: LOAD_WAIT }
  )
  // Extra settle time for Three.js scene
  await page.waitForTimeout(800)
}

// ── Test suites ───────────────────────────────────────────────────────────────

async function suiteHUD() {
  console.log('\n── HUD ─────────────────────────────────────────────────────────')
  await shot('hud-01-initial')

  await check('player HP element exists', () => page.$('#hp-fill'))
  await check('minimap canvas exists',    () => page.$('#minimap-canvas'))
  await check('xp-drops container',       () => page.$('#xp-drops'))
  await check('skill panel exists',       () => page.$('#skill-panel'))
  await check('status bar exists',        () => page.$('#status'))

  const hp = await vp(() => window._vp?.player?.stats?.hp)
  await check('player HP > 0', hp > 0, `hp=${hp}`)

  const maxHp = await vp(() => window._vp?.player?.stats?.maxHp)
  await check('player maxHp set', maxHp > 0, `maxHp=${maxHp}`)

  const fillPct = await page.$eval('#hp-fill', el => el.style.width)
  await check('HP bar has width', fillPct && fillPct !== '0%', `width=${fillPct}`)
}

async function suiteMovement() {
  console.log('\n── Movement ────────────────────────────────────────────────────')

  const posBefore = await vp(() => {
    const p = window._vp?.player?.object?.position
    return p ? { x: p.x, z: p.z } : null
  })
  await check('player position readable', !!posBefore, JSON.stringify(posBefore))

  // Click somewhere in the world (centre of canvas)
  const box = await page.evaluate(() => {
    const c = document.getElementById('canvas-container')
    const r = c.getBoundingClientRect()
    return { cx: r.left + r.width / 2 + 80, cy: r.top + r.height / 2 + 60 }
  })
  await page.mouse.click(box.cx, box.cy)
  await shot('movement-02-after-click')
  await page.waitForTimeout(2000)

  const posAfter = await vp(() => {
    const p = window._vp?.player?.object?.position
    return p ? { x: p.x, z: p.z } : null
  })
  const moved = Math.abs(posAfter.x - posBefore.x) > 0.1 || Math.abs(posAfter.z - posBefore.z) > 0.1
  await check('player moved after click', moved,
    `before(${posBefore.x.toFixed(2)},${posBefore.z.toFixed(2)}) after(${posAfter.x.toFixed(2)},${posAfter.z.toFixed(2)})`)
}

async function suiteCombat() {
  console.log('\n── Combat ──────────────────────────────────────────────────────')

  const enemyCount = await vp(() => window._vp?.enemies?.enemies?.size ?? 0)
  await check('enemies spawned', enemyCount > 0, `${enemyCount} enemies`)

  const playerHP = await vp(() => window._vp?.player?.stats?.hp)
  const maxHP    = await vp(() => window._vp?.player?.stats?.maxHp)
  await check('player alive (HP > 0)', playerHP > 0, `${playerHP}/${maxHP}`)

  const combatTick = await vp(() => typeof window._vp?.combat?.update === 'function')
  await check('combat system has update()', combatTick)

  await shot('combat-03-state')
}

async function suiteSkills() {
  console.log('\n── Skills panel (Tab) ──────────────────────────────────────────')

  // Skills panel starts visible — Tab should hide it
  const startVisible = await page.$eval('#skill-panel', el => !el.classList.contains('hidden'))
  await page.keyboard.press('Tab')
  await page.waitForTimeout(300)

  const afterFirstTab = await page.$eval('#skill-panel', el => !el.classList.contains('hidden'))
  await check('Tab toggles skill panel', afterFirstTab !== startVisible)
  await shot('skills-04-panel-toggled')

  const tileCount = await page.$$eval('.skill-tile', tiles => tiles.length)
  await check('skill tiles rendered', tileCount > 0, `${tileCount} tiles`)

  // Tab again to restore original state
  await page.keyboard.press('Tab')
  await page.waitForTimeout(200)
  const restored = await page.$eval('#skill-panel', el => !el.classList.contains('hidden'))
  await check('second Tab restores panel state', restored === startVisible)

  // Check XP system
  const woodLvl = await vp(() => window._vp?.player?.stats?.skills?.woodcutting?.level ?? 0)
  await check('woodcutting skill tracked', woodLvl >= 1, `level ${woodLvl}`)
}

async function suiteMinimap() {
  console.log('\n── Minimap ─────────────────────────────────────────────────────')

  const mmVisible = await page.$eval('#minimap-canvas', el => {
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  })
  await check('minimap canvas visible', mmVisible)

  // Open map modal (M key)
  await page.keyboard.press('m')
  await page.waitForTimeout(400)
  await shot('minimap-05-modal-open')

  const modalOpen = await page.$eval('#map-modal', el => el.classList.contains('open'))
  await check('map modal opens on M', modalOpen)

  // Close map modal
  await page.keyboard.press('m')
  await page.waitForTimeout(300)
  const modalClosed = await page.$eval('#map-modal', el => !el.classList.contains('open'))
  await check('map modal closes on second M', modalClosed)
}

async function suiteSettings() {
  console.log('\n── Settings menu (Escape / Phaser) ─────────────────────────────')

  const phaserCanvas = await page.$('#phaser-ui-canvas')
  await check('Phaser canvas present in DOM', !!phaserCanvas)

  // Open settings
  await page.keyboard.press('Escape')
  await page.waitForTimeout(800)
  await shot('settings-06-open')

  // Check game loop paused via _vp
  const loopRunning = await vp(() => window._vp?.gameLoop?._running ?? true)
  await check('game loop paused when settings open', !loopRunning)

  // Check Phaser canvas is interactive (check inline style directly)
  const phaserZIndex = await page.$eval('#phaser-ui-canvas', el => el.style.zIndex)
  await check('Phaser canvas elevated z-index', Number(phaserZIndex) >= 900, `z-index=${phaserZIndex}`)

  // Close settings
  await page.keyboard.press('Escape')
  await page.waitForTimeout(600)
  await shot('settings-07-closed')

  const loopResumed = await vp(() => window._vp?.gameLoop?._running ?? false)
  await check('game loop resumes after close', loopResumed)
}

async function suiteChat() {
  console.log('\n── Chat log ────────────────────────────────────────────────────')

  const chatBox = await page.$('#chat-box')
  await check('chat box exists', !!chatBox)

  const chatVisible = await page.$eval('#chat-box', el => {
    const r = el.getBoundingClientRect()
    return r.width > 0
  })
  await check('chat box visible', chatVisible)

  // Count existing rows, then send a message
  const rowsBefore = await page.$$eval('#chat-box [data-channel]', r => r.length)

  // Focus the chat input and type
  await page.click('input[placeholder="Press Enter to chat..."]').catch(() => {})
  await page.waitForTimeout(150)
  await page.keyboard.type('Hello world test')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  await shot('chat-08-message-sent')

  const rowsAfter = await page.$$eval('#chat-box [data-channel]', r => r.length)
  await check('chat message appeared after send', rowsAfter > rowsBefore,
    `before=${rowsBefore} after=${rowsAfter}`)
}

// ── Runner ────────────────────────────────────────────────────────────────────

const SUITES = {
  hud:      suiteHUD,
  movement: suiteMovement,
  combat:   suiteCombat,
  skills:   suiteSkills,
  minimap:  suiteMinimap,
  settings: suiteSettings,
  chat:     suiteChat,
}

;(async () => {
  browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--use-gl=swiftshader',       // software WebGL (no GPU needed)
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--disable-web-security',
    ]
  })
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  })
  page = await ctx.newPage()

  // Collect console errors from the game
  const gameErrors = []
  page.on('console', msg => { if (msg.type() === 'error') gameErrors.push(msg.text()) })
  page.on('pageerror', err => gameErrors.push(err.message))

  console.log(`\nConnecting to ${URL}…`)
  await page.goto(URL)
  console.log('Waiting for game to load…')
  await waitLoad()
  await shot('00-loaded')
  console.log('Game loaded. Running suites…')

  const toRun = SUITE === 'all' ? Object.values(SUITES) : [SUITES[SUITE]].filter(Boolean)

  for (const suite of toRun) {
    await suite().catch(e => fail(suite.name, e.message))
  }

  // Summary
  console.log('\n════════════════════════════════════════')
  const passed = results.filter(r => r.ok).length
  const total  = results.length
  console.log(`${passed}/${total} checks passed`)

  if (gameErrors.length) {
    console.log(`\nBrowser errors (${gameErrors.length}):`)
    gameErrors.slice(0, 10).forEach(e => console.error('  ⚠', e))
  }

  console.log(`\nScreenshots: ${SS_DIR}/`)
  await browser.close()

  process.exit(passed === total ? 0 : 1)
})()
