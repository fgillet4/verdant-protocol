/**
 * Verdant Protocol — Game Server
 * Socket.io server for real-time multiplayer.
 * Verifies FrankStation JWT on handshake.
 * Port: 3050
 */

import { createServer } from 'http'
import { Server }       from 'socket.io'
import jwt              from 'jsonwebtoken'

const PORT       = 3050
const JWT_SECRET = process.env.JWT_SECRET || '4774d8ad60c14b12b2f58638ff9792daea0362b2d421cbb13d4d24df76a10cf254aa03792891773e1b1485f9f563329b'

// Zone: one server = one persistent world zone
// players: socketId → { userId, username, x, z, rotation }
const players = new Map()

const httpServer = createServer((req, res) => {
  res.writeHead(200)
  res.end('Verdant Protocol game server')
})

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  path: '/socket.io',
})

// ── Auth middleware (runs before any socket event) ────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) {
    // Allow guests (no userId) — they can see others but won't be broadcast
    socket.data.guest = true
    socket.data.username = 'Guest'
    return next()
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    socket.data.userId   = decoded.userId
    socket.data.username = decoded.username
    socket.data.guest    = false
    next()
  } catch {
    // Bad token — allow as guest so the game still works
    socket.data.guest    = true
    socket.data.username = 'Guest'
    next()
  }
})

// ── Connection handler ────────────────────────────────────────────────────────
io.on('connection', socket => {
  const { userId, username, guest } = socket.data
  console.log(`[+] ${username}${guest ? ' (guest)' : ''} connected — ${socket.id}`)

  // Send the new player a snapshot of all current players
  const snapshot = []
  for (const [sid, p] of players) {
    snapshot.push({ socketId: sid, ...p })
  }
  socket.emit('world:snapshot', snapshot)

  // Register this player (guests still show up so others can see them)
  const displayName = guest ? `Guest_${socket.id.slice(0, 5)}` : username
  players.set(socket.id, {
    userId:   userId ?? null,
    username: displayName,
    x: 0, z: 0, rotation: 0,
  })

  // Notify others that a new player joined
  socket.broadcast.emit('player:joined', {
    socketId: socket.id,
    username: displayName,
    x: 0, z: 0, rotation: 0,
  })

  // ── Position update (client sends ~10 Hz) ──────────────────────────────────
  socket.on('player:move', ({ x, z, rotation }) => {
    const p = players.get(socket.id)
    if (!p) return
    p.x = x; p.z = z; p.rotation = rotation ?? 0
    // Broadcast to everyone except sender
    socket.broadcast.emit('player:moved', {
      socketId: socket.id,
      x, z, rotation: p.rotation,
    })
  })

  // ── Chat relay ────────────────────────────────────────────────────────────
  socket.on('chat:send', ({ text }) => {
    if (!text || typeof text !== 'string') return
    const safe = text.slice(0, 200).replace(/</g, '&lt;')
    io.emit('chat:message', {
      socketId: socket.id,
      username: players.get(socket.id)?.username ?? 'Unknown',
      text:     safe,
    })
  })

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const p = players.get(socket.id)
    console.log(`[-] ${p?.username ?? socket.id} disconnected`)
    players.delete(socket.id)
    io.emit('player:left', { socketId: socket.id })
  })
})

httpServer.listen(PORT, () => {
  console.log(`[Verdant] Game server running on port ${PORT}`)
  console.log(`[Verdant] ${players.size} players online`)
})
