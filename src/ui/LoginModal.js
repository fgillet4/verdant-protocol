/**
 * LoginModal — FrankStation account login overlay.
 * Shows at boot if no fs_token in localStorage.
 * On success stores the token and resolves so the boot sequence can continue.
 * OWNED BY: ui-agent
 */

const API_BASE = 'https://frankstation.org/api'

export class LoginModal {
  /**
   * Show the modal and resolve when the user either logs in or skips.
   * @returns {Promise<boolean>} true = logged in, false = guest
   */
  show() {
    return new Promise(resolve => {
      this._resolve = resolve
      this._build()
    })
  }

  _build() {
    const backdrop = document.createElement('div')
    backdrop.style.cssText = [
      'position:fixed;inset:0;z-index:2000;',
      'background:rgba(0,0,0,0.88);',
      'display:flex;align-items:center;justify-content:center;',
      'font-family:"Courier New",monospace;',
    ].join('')
    this._backdrop = backdrop

    const box = document.createElement('div')
    box.style.cssText = [
      'background:#060f06;border:1px solid rgba(46,125,50,0.4);',
      'border-radius:10px;padding:36px 40px;width:360px;',
      'box-shadow:0 8px 40px rgba(0,0,0,0.8);',
      'display:flex;flex-direction:column;gap:0;',
    ].join('')

    // Header
    const header = document.createElement('div')
    header.style.cssText = 'text-align:center;margin-bottom:28px;'
    header.innerHTML = `
      <div style="font-size:9px;letter-spacing:5px;color:#76ff03;margin-bottom:6px;">VERDANT PROTOCOL</div>
      <div style="font-size:18px;color:#4caf50;margin-bottom:4px;">Sign In</div>
      <div style="font-size:10px;color:#4caf50;opacity:0.5;">Use your FrankStation account</div>
    `
    box.appendChild(header)

    // Error message
    this._errorEl = document.createElement('div')
    this._errorEl.style.cssText = [
      'font-size:10px;color:#ef5350;text-align:center;',
      'margin-bottom:12px;min-height:16px;',
    ].join('')
    box.appendChild(this._errorEl)

    // Username
    this._userInput = this._input('Username')
    box.appendChild(this._userInput)

    // Password
    this._passInput = this._input('Password', 'password')
    box.appendChild(this._passInput)

    // Login button
    this._loginBtn = this._btn('Sign In', '#76ff03', '#1b5e20', () => this._submit())
    box.appendChild(this._loginBtn)

    // Divider
    const div = document.createElement('div')
    div.style.cssText = 'border-top:1px solid rgba(46,125,50,0.15);margin:16px 0;'
    box.appendChild(div)

    // Guest button
    box.appendChild(this._btn('Play as Guest', '#81c784', 'transparent', () => this._guest(), true))

    backdrop.appendChild(box)
    document.body.appendChild(backdrop)

    // Submit on Enter
    this._passInput.querySelector('input').addEventListener('keydown', e => {
      if (e.key === 'Enter') this._submit()
    })
    this._userInput.querySelector('input').addEventListener('keydown', e => {
      if (e.key === 'Enter') this._passInput.querySelector('input').focus()
    })

    this._userInput.querySelector('input').focus()
  }

  _input(placeholder, type = 'text') {
    const wrap = document.createElement('div')
    wrap.style.cssText = 'margin-bottom:12px;'
    const input = document.createElement('input')
    input.type = type
    input.placeholder = placeholder
    input.autocomplete = type === 'password' ? 'current-password' : 'username'
    input.style.cssText = [
      'width:100%;box-sizing:border-box;',
      'background:rgba(76,175,80,0.06);',
      'border:1px solid rgba(76,175,80,0.25);border-radius:5px;',
      'color:#c8e6c9;font-family:"Courier New",monospace;font-size:12px;',
      'padding:10px 12px;outline:none;',
      'transition:border-color 0.15s;',
    ].join('')
    input.addEventListener('focus', () => { input.style.borderColor = 'rgba(118,255,3,0.5)' })
    input.addEventListener('blur',  () => { input.style.borderColor = 'rgba(76,175,80,0.25)' })
    wrap.appendChild(input)
    return wrap
  }

  _btn(label, color, bg, onClick, secondary = false) {
    const btn = document.createElement('button')
    btn.textContent = label
    btn.style.cssText = [
      'width:100%;padding:10px;border-radius:5px;cursor:pointer;',
      'font-family:"Courier New",monospace;font-size:11px;letter-spacing:0.08em;',
      `color:${color};`,
      secondary
        ? `background:transparent;border:1px solid rgba(76,175,80,0.2);`
        : `background:${bg};border:1px solid ${color}33;`,
      'transition:opacity 0.15s;',
    ].join('')
    btn.addEventListener('mouseenter', () => { btn.style.opacity = '0.8' })
    btn.addEventListener('mouseleave', () => { btn.style.opacity = '1' })
    btn.addEventListener('click', onClick)
    return btn
  }

  async _submit() {
    const username = this._userInput.querySelector('input').value.trim()
    const password = this._passInput.querySelector('input').value

    if (!username || !password) {
      this._errorEl.textContent = 'Please enter your username and password.'
      return
    }

    this._loginBtn.textContent = 'Signing in...'
    this._loginBtn.disabled = true
    this._errorEl.textContent = ''

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        this._errorEl.textContent = data.error ?? 'Login failed. Check your credentials.'
        this._loginBtn.textContent = 'Sign In'
        this._loginBtn.disabled = false
        return
      }

      localStorage.setItem('fs_token', data.token)
      this._close()
      this._resolve(true)
    } catch {
      this._errorEl.textContent = 'Could not reach FrankStation. Check your connection.'
      this._loginBtn.textContent = 'Sign In'
      this._loginBtn.disabled = false
    }
  }

  _guest() {
    this._close()
    this._resolve(false)
  }

  _close() {
    this._backdrop?.remove()
  }
}
