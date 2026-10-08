require('dotenv').config();

const { createServer } = require('http');
const { timingSafeEqual } = require('crypto');
const { Server } = require('socket.io');

const PORT = Number(process.env.SOCKET_PORT || 3015);
const BACKEND_API_URL = (process.env.BACKEND_API_URL || 'http://localhost:1377/api').replace(/\/+$/, '');
const INTERNAL_TOKEN = process.env.SOCKET_INTERNAL_TOKEN || '';
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedEvents = new Set([
  'notification:new',
  'notification:broadcast',
  'system:announcement',
  'wallet:updated',
  'match:result_ready',
  'match:submission_received',
  'match:postpone_response',
  'match:dispute_opened',
  'leaderboard:updated',
]);
const broadcastEvents = new Set(['notification:broadcast', 'system:announcement']);
const connections = new Map();
const devices = new Map();

const httpServer = createServer(async (request, response) => {
  if (request.url?.startsWith('/socket.io/')) return;
  if (request.method === 'GET' && request.url === '/health') {
    return sendJson(response, 200, {
      status: 'ok',
      namespaces: ['/main-sockets', '/device-sockets'],
      connectedUsers: connections.size,
      connectedDevices: devices.size,
    });
  }
  if (request.method === 'POST' && request.url === '/events/publish') {
    return publishEvent(request, response);
  }
  return sendJson(response, 404, { error: 'Not found' });
});

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGINS.length ? CLIENT_ORIGINS : true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
});

const mainNamespace = io.of('/main-sockets');
const deviceNamespace = io.of('/device-sockets');
for (const namespace of [mainNamespace, deviceNamespace]) {
  namespace.use(authenticateUser);
  namespace.on('connection', (socket) => registerUserSocket(socket, namespace));
}

async function authenticateUser(socket, next) {
  const token = getBearerToken(socket.handshake.auth?.token || socket.handshake.headers.authorization);
  if (!token) return next(new Error('Authentication required'));

  try {
    const response = await fetch(`${BACKEND_API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return next(new Error('Authentication failed'));
    const user = await response.json();
    if (!Number.isSafeInteger(Number(user.id)) || Number(user.id) < 1) {
      return next(new Error('Authentication failed'));
    }
    socket.data.userId = String(user.id);
    socket.data.documentId = typeof user.documentId === 'string' ? user.documentId : '';
    next();
  } catch (error) {
    console.error('[PLA sockets] user token validation failed:', error.message);
    next(new Error('Authentication service unavailable'));
  }
}

function registerUserSocket(socket, namespace) {
  const userId = socket.data.userId;
  const userRoom = `user:${userId}`;
  socket.join(userRoom);
  connections.set(socket.id, { userId, namespace: namespace.name });
  socket.emit(`${namespace.name.slice(1)}:connected`, { socketId: socket.id });

  socket.on('device:register', (registration = {}) => {
    const deviceId = typeof registration.deviceId === 'string' ? registration.deviceId.trim() : '';
    if (!deviceId || deviceId.length > 160) {
      socket.emit('device:register:error', { message: 'A valid deviceId is required' });
      return;
    }

    const previous = devices.get(deviceId);
    if (previous && previous.socketId !== socket.id) {
      const oldNamespace = io.of(previous.namespace);
      oldNamespace.to(previous.socketId).emit('device:session-replaced', { deviceId });
      oldNamespace.sockets.get(previous.socketId)?.disconnect(true);
    }
    devices.set(deviceId, { socketId: socket.id, userId, namespace: namespace.name });
    socket.join(`device:${deviceId}`);
    socket.emit('device:register:success', { deviceId });
  });

  socket.on('device:heartbeat', ({ deviceId } = {}) => {
    const device = devices.get(String(deviceId || ''));
    if (device?.socketId === socket.id) device.lastSeen = Date.now();
  });

  socket.on('watch:tournament', (tournamentId) => {
    if (isRoomId(tournamentId)) socket.join(`tournament:${tournamentId}`);
  });
  socket.on('unwatch:tournament', (tournamentId) => {
    if (isRoomId(tournamentId)) socket.leave(`tournament:${tournamentId}`);
  });
  socket.on('watch:match', (matchId) => {
    if (isRoomId(matchId)) socket.join(`match:${matchId}`);
  });
  socket.on('unwatch:match', (matchId) => {
    if (isRoomId(matchId)) socket.leave(`match:${matchId}`);
  });
  socket.on('ping', (data) => socket.emit('pong', data ?? { timestamp: Date.now() }));

  socket.on('disconnect', () => {
    connections.delete(socket.id);
    for (const [deviceId, device] of devices) {
      if (device.socketId === socket.id) devices.delete(deviceId);
    }
  });
}

async function publishEvent(request, response) {
  if (!INTERNAL_TOKEN || !safeTokenEquals(getBearerToken(request.headers.authorization), INTERNAL_TOKEN)) {
    return sendJson(response, 401, { error: 'Unauthorized' });
  }

  try {
    const body = await readJsonBody(request);
    const { event, payload = {}, target } = body;
    if (!allowedEvents.has(event)) return sendJson(response, 400, { error: 'Unsupported event' });

    if (target?.type === 'user' && isRoomId(target.id)) {
      mainNamespace.to(`user:${target.id}`).emit(event, payload);
      deviceNamespace.to(`user:${target.id}`).emit(event, payload);
    } else if (target?.type === 'tournament' && isRoomId(target.id)) {
      mainNamespace.to(`tournament:${target.id}`).emit(event, payload);
      deviceNamespace.to(`tournament:${target.id}`).emit(event, payload);
    } else if (target?.type === 'match' && isRoomId(target.id)) {
      mainNamespace.to(`match:${target.id}`).emit(event, payload);
      deviceNamespace.to(`match:${target.id}`).emit(event, payload);
    } else if (target?.type === 'broadcast' && broadcastEvents.has(event)) {
      mainNamespace.emit(event, payload);
      deviceNamespace.emit(event, payload);
    } else {
      return sendJson(response, 400, { error: 'A valid event target is required' });
    }

    return sendJson(response, 202, { accepted: true });
  } catch (error) {
    if (error.statusCode) return sendJson(response, error.statusCode, { error: error.message });
    console.error('[PLA sockets] event publish failed:', error.message);
    return sendJson(response, 500, { error: 'Could not publish event' });
  }
}

function getBearerToken(value) {
  if (typeof value !== 'string') return '';
  return value.startsWith('Bearer ') ? value.slice(7).trim() : value.trim();
}

function safeTokenEquals(provided, expected) {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length > 0 && left.length === right.length && timingSafeEqual(left, right);
}

function isRoomId(value) {
  return (typeof value === 'string' || typeof value === 'number')
    && /^[a-zA-Z0-9_-]{1,128}$/.test(String(value));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        const error = new Error('Request body is too large');
        error.statusCode = 413;
        reject(error);
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        const error = new Error('Invalid JSON body');
        error.statusCode = 400;
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(data));
}

httpServer.listen(PORT, () => {
  console.log(`[PLA sockets] listening on port ${PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    io.close(() => process.exit(0));
  });
}
