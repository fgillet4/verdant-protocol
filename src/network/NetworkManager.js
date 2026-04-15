/**
 * NetworkManager — real-time multiplayer via Socket.io.
 * Connects to the game server, sends local player position at ~10 Hz,
 * and relays server events onto the EventBus so the rest of the game
 * can react without knowing about sockets.
 * OWNED BY: network-agent
 */
import { io }  from 'socket.io-client'
import { bus } from '../utils/EventBus.js'

const MOVE_HZ       = 10          // position updates per second
const MOVE_INTERVAL = 1000 / MOVE_HZ

export class NetworkManager {
  /**
   * @param {import('../player/Player.js').Player} player
   */
  constructor(player) {
    this._player   = player
    this._socket   = null
    this._moveTimer = null
    this._lastX    = null
    this._lastZ    = null
    this._connected = false
  }

  /** Connect to the game server. Call after login/boot. */
  connect() {
    const token = localStorage.getItem('fs_token') ?? undefined

    this._socket = io({
      path:  '/socket.io',
      auth:  { token },
      transports: ['websocket', 'polling'],
    })

    const s = this._socket

    s.on('connect', () => {
      this._connected = true
      console.log('[Network] Connected to game server:', s.id)
      bus.emit('network:connected', { socketId: s.id })
      this._startMoveBroadcast()
    })

    s.on('disconnect', reason => {
      this._connected = false
      console.log('[Network] Disconnected:', reason)
      bus.emit('network:disconnected', {})
      clearInterval(this._moveTimer)
    })

    s.on('connect_error', err => {
      console.warn('[Network] Connection error:', err.message)
    })

    // ── World snapshot: all current players on join ───────────────────────
    s.on('world:snapshot', players => {
      for (const p of players) {
        bus.emit('network:player-joined', { playerId: p.socketId, data: p })
      }
    })

    // ── Other player joined ───────────────────────────────────────────────
    s.on('player:joined', p => {
      bus.emit('network:player-joined', { playerId: p.socketId, data: p })
    })

    // ── Other player moved ────────────────────────────────────────────────
    s.on('player:moved', ({ socketId, x, z, rotation }) => {
      bus.emit('network:player-moved', { playerId: socketId, x, z, rotation })
    })

    // ── Other player left ─────────────────────────────────────────────────
    s.on('player:left', ({ socketId }) => {
      bus.emit('network:player-left', { playerId: socketId })
    })

    // ── Chat from server ──────────────────────────────────────────────────
    s.on('chat:message', ({ socketId, username, text }) => {
      // Only show if from someone else — our own chat is already in the log
      if (socketId !== s.id) {
        bus.emit('chat:message', { playerId: socketId, playerName: username, text })
      }
    })
  }

  /** Send a chat message to all players. */
  sendChat(text) {
    this._socket?.emit('chat:send', { text })
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _startMoveBroadcast() {
    this._moveTimer = setInterval(() => {
      if (!this._connected) return
      const pos = this._player.object.position
      // Skip if hasn't moved (saves bandwidth)
      if (pos.x === this._lastX && pos.z === this._lastZ) return
      this._lastX = pos.x
      this._lastZ = pos.z
      this._socket.emit('player:move', {
        x: parseFloat(pos.x.toFixed(2)),
        z: parseFloat(pos.z.toFixed(2)),
        rotation: parseFloat(this._player.object.rotation.y.toFixed(3)),
      })
    }, MOVE_INTERVAL)
  }
}
