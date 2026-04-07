/**
 * play-session.js — Actually plays Verdant Protocol for a few minutes.
 * Moves, fights, gathers, opens UI panels, reports what happened.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const URL    = process.env.VP_URL ?? 'http://localhost:5173'
const SS_DIR = 'tools/test-screenshots/play'
mkdirSync(SS_DIR, { recursive: true })

let page, browser
let shotN = 0

async function shot(label) {
  const file = `${SS_DIR}/${String(++shotN).padStart(2,'0')}-${label}.png`
  await page.screenshot({ path: file })
  return file
}
async function vp(fn) { return page.evaluate(fn) }
async function wait(ms) { return page.waitForTimeout(ms) }
async function click(x, y) {
  await page.mouse.click(x, y)
}
async function key(k) { await page.keyboard.press(k) }

// ── Game state helpers ──────────────────────────────────────────────────────

async function playerPos() {
  return vp(() => {
    const p = window._vp?.player?.object?.position
    return p ? { x: +p.x.toFixed(1), z: +p.z.toFixed(1) } : null
  })
}

async function playerStats() {
  return vp(() => {
    const s = window._vp?.player?.stats
    return s ? { hp: Math.ceil(s.hp), maxHp: s.maxHp, combatStyle: s.combatStyle } : null
  })
}

async function skillLevels() {
  return vp(() => {
    const sk = window._vp?.player?.stats?.skills
    if (!sk) return {}
    return Object.fromEntries(
      Object.entries(sk).map(([k,v]) => [k, v?.level ?? v ?? 0])
    )
  })
}

async function enemies() {
  return vp(() => {
    const em = window._vp?.enemies?.enemies
    if (!em) return []
    return [...em.entries()].map(([id, e]) => ({
      id,
      hp: e.stats?.hp ?? '?',
      maxHp: e.stats?.maxHp ?? '?',
      pos: e.object?.position ? {
        x: +e.object.position.x.toFixed(1),
        z: +e.object.position.z.toFixed(1)
      } : null
    }))
  })
}

async function chatLines() {
  return page.$$eval('#chat-box [data-channel]', rows =>
    rows.slice(-8).map(r => r.textContent?.trim()).filter(Boolean)
  )
}

async function inventoryItems() {
  return vp(() => {
    const inv = window._vp?.inventory
    return inv?.items?.map(it => it ? `${it.name} x${it.quantity??1}` : null).filter(Boolean) ?? []
  })
}

// ── Click a specific world-space position on the canvas ────────────────────
// The game uses a click-to-move ray cast. We click at screen coords.
// Centre of canvas = roughly world origin.

const CX = 640, CY = 360   // screen centre

function worldToScreen(wx, wz) {
  // Approximate: 1 world unit ≈ 18 screen px at default zoom
  return { x: CX + wx * 18, y: CY + wz * 18 }
}

async function moveTo(wx, wz) {
  const s = worldToScreen(wx, wz)
  await click(s.x, s.y)
  await wait(1200)
}

// ── Find an enemy on-screen and click it ──────────────────────────────────

async function clickEnemy() {
  const ems = await enemies()
  if (!ems.length) return false
  // Find the closest living enemy
  const alive = ems.filter(e => e.hp > 0 && e.pos)
  if (!alive.length) return false
  const e = alive[0]
  const s = worldToScreen(e.pos.x, e.pos.z)
  // Clamp to canvas area
  const sx = Math.max(50, Math.min(1230, s.x))
  const sy = Math.max(50, Math.min(670, s.y))
  await click(sx, sy)
  return e
}

// ── Play session ─────────────────────────────────────────────────────────

;(async () => {
  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']
  })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  page = await ctx.newPage()

  page.on('console', msg => {
    const t = msg.type()
    if (t === 'error' || (t === 'warn' && msg.text().includes('Verdant')))
      console.log(`  [browser ${t}]`, msg.text().slice(0, 120))
  })

  console.log('Loading game…')
  await page.goto(URL)
  await page.waitForFunction(
    () => document.getElementById('loading')?.classList.contains('hidden'),
    { timeout: 15000 }
  )
  await wait(1000)
  console.log('✓ Game loaded\n')

  // ── 1. Initial state ────────────────────────────────────────────────────
  await shot('loaded')
  let pos   = await playerPos()
  let stats = await playerStats()
  let ems   = await enemies()
  console.log('=== INITIAL STATE ===')
  console.log(`Player position: (${pos?.x}, ${pos?.z})`)
  console.log(`HP: ${stats?.hp}/${stats?.maxHp}  style: ${stats?.combatStyle}`)
  console.log(`Enemies alive: ${ems.filter(e=>e.hp>0).length}/${ems.length}`)

  // ── 2. Walk around the map ──────────────────────────────────────────────
  console.log('\n=== EXPLORING ===')

  await moveTo(5, 2)
  pos = await playerPos()
  console.log(`Moved → (${pos?.x}, ${pos?.z})`)

  await moveTo(8, -3)
  pos = await playerPos()
  console.log(`Moved → (${pos?.x}, ${pos?.z})`)
  await shot('exploring')

  await moveTo(3, 6)
  await moveTo(-4, 3)
  pos = await playerPos()
  console.log(`Moved → (${pos?.x}, ${pos?.z})`)

  // ── 3. Open minimap ─────────────────────────────────────────────────────
  console.log('\n=== MINIMAP ===')
  await key('m')
  await wait(400)
  await shot('map-open')
  console.log('Opened world map (M)')
  await key('m')
  await wait(300)

  // ── 4. Open skill panel ─────────────────────────────────────────────────
  console.log('\n=== SKILLS ===')
  await key('Tab')
  await wait(300)
  await shot('skills-open')
  const skills = await skillLevels()
  console.log('Skill levels:', JSON.stringify(skills, null, 2))
  await key('Tab')
  await wait(200)

  // ── 5. Open inventory ───────────────────────────────────────────────────
  console.log('\n=== INVENTORY ===')
  await key('i')
  await wait(400)
  await shot('inventory-open')
  const inv = await inventoryItems()
  console.log('Inventory:', inv.length ? inv.join(', ') : '(empty)')
  await key('i')
  await wait(200)

  // ── 6. Try to fight an enemy ────────────────────────────────────────────
  console.log('\n=== COMBAT ===')
  // Move toward the enemy area
  await moveTo(6, 0)
  const target = await clickEnemy()
  if (target) {
    console.log(`Clicked enemy id=${target.id} at (${target.pos?.x}, ${target.pos?.z}) HP=${target.hp}/${target.maxHp}`)
  } else {
    console.log('No enemy in range, moving closer…')
    await moveTo(10, 0)
    await clickEnemy()
  }
  await wait(800)
  await shot('combat-started')

  // Wait 4 combat ticks (2.4s) and watch HP change
  await wait(2500)
  await shot('combat-mid')
  const ems2  = await enemies()
  const ps2   = await playerStats()
  const alive2 = ems2.filter(e=>e.hp>0)
  console.log(`After combat: player HP ${ps2?.hp}/${ps2?.maxHp}`)
  console.log(`Enemies alive: ${alive2.length}`)
  alive2.forEach(e => console.log(`  Enemy ${e.id}: ${e.hp}/${e.maxHp} HP`))

  // Keep fighting
  await wait(3000)
  await shot('combat-after')
  const ems3  = await enemies()
  const ps3   = await playerStats()
  console.log(`After more combat: player HP ${ps3?.hp}/${ps3?.maxHp}`)
  console.log(`Enemies alive: ${ems3.filter(e=>e.hp>0).length}`)

  // ── 7. Check chat log for events ────────────────────────────────────────
  console.log('\n=== CHAT LOG (last 8 lines) ===')
  const chat = await chatLines()
  chat.forEach(l => console.log(' ', l))

  // ── 8. Open settings ───────────────────────────────────────────────────
  console.log('\n=== SETTINGS ===')
  await key('Escape')
  await wait(700)
  await shot('settings')
  const loopStopped = await vp(() => !window._vp?.gameLoop?._running)
  console.log(`Game loop paused: ${loopStopped}`)

  // Click Graphics tab
  await click(519, 83)   // approx Graphics tab position in settings panel
  await wait(300)
  await shot('settings-graphics')

  // Close settings
  await key('Escape')
  await wait(500)
  console.log('Settings closed, game resumed')

  // ── 9. Final state ──────────────────────────────────────────────────────
  console.log('\n=== FINAL STATE ===')
  await shot('final')
  const posF   = await playerPos()
  const statsF = await playerStats()
  const skillsF = await skillLevels()
  const invF   = await inventoryItems()
  const emsF   = await enemies()

  console.log(`Player position: (${posF?.x}, ${posF?.z})`)
  console.log(`HP: ${statsF?.hp}/${statsF?.maxHp}`)
  console.log(`Enemies alive: ${emsF.filter(e=>e.hp>0).length}/${emsF.length}`)
  console.log(`Skills:`, Object.entries(skillsF).map(([k,v])=>`${k}:${v}`).join('  '))
  console.log(`Inventory:`, invF.length ? invF.join(', ') : '(empty)')

  console.log(`\nScreenshots → ${SS_DIR}/`)
  await browser.close()
})()
