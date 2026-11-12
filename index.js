
const mineflayer = require('mineflayer');
const http = require('http');

// ==========================================
// CONFIGURATION
// ==========================================

const CONFIG = {
  host: '9a3smp.mcsh.gg',
  port: 25565,

  username: 'bot1',
  version: false, // Auto detect Minecraft version

  // Velocity backend rotation
  servers: 'smp',
  switchInterval: 10 * 60 * 1000,

  // Reconnection
  reconnectDelay: 15000,
  maxReconnectDelay: 60000,

  // AFK actions
  swingMin: 20000,
  swingMax: 35000,

  lookMin: 30000,
  lookMax: 50000,

  // Health check
  httpPort: process.env.PORT || 3000
};

// ==========================================
// STATE
// ==========================================

let bot = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
let swingTimer = null;
let lookTimer = null;
let switchTimer = null;

let currentServerIndex = 0;
let connected = false;
let stopping = false;
let lastError = 'None';

let generation = 0;

// ==========================================
// UTILITIES
// ==========================================

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function log(message) {
  console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
}

function clearBotTimers() {
  clearTimeout(swingTimer);
  clearTimeout(lookTimer);
  clearInterval(switchTimer);

  swingTimer = null;
  lookTimer = null;
  switchTimer = null;
}

// ==========================================
// AFK ACTIONS
// ==========================================

function scheduleSwing(id) {
  if (id !== generation || !connected || !bot) return;

  swingTimer = setTimeout(() => {
    if (id !== generation || !connected || !bot) return;

    try {
      bot.swingArm('right');
      log('AFK: Swing arm');
    } catch (err) {
      log(`Swing error: ${err.message}`);
    }

    scheduleSwing(id);
  }, random(CONFIG.swingMin, CONFIG.swingMax));
}

function scheduleLook(id) {
  if (id !== generation || !connected || !bot) return;

  lookTimer = setTimeout(() => {
    if (id !== generation || !connected || !bot || !bot.entity) return;

    try {
      const yaw = (Math.random() * Math.PI * 2) - Math.PI;
      const pitch = (Math.random() - 0.5) * 0.5;

      bot.look(yaw, pitch, true);
      log('AFK: Looking around');
    } catch (err) {
      log(`Look error: ${err.message}`);
    }

    scheduleLook(id);
  }, random(CONFIG.lookMin, CONFIG.lookMax));
}

// ==========================================
// SERVER SWITCHING
// ==========================================

function switchServer() {
  if (!connected || !bot) return;

  currentServerIndex =
    (currentServerIndex + 1) % CONFIG.servers.length;

  const target = CONFIG.servers[currentServerIndex];

  try {
    bot.chat(`/server ${target}`);
    log(`Switching to ${target}`);
  } catch (err) {
    log(`Switch error: ${err.message}`);
  }
}

// ==========================================
// RECONNECT
// ==========================================

function scheduleReconnect() {
  if (stopping || reconnectTimer) return;

  const delay = Math.min(
    CONFIG.reconnectDelay * Math.pow(1.5, reconnectAttempts),
    CONFIG.maxReconnectDelay
  );

  reconnectAttempts++;

  log(`Reconnecting in ${Math.round(delay / 1000)} seconds`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectBot();
  }, delay);
}

// ==========================================
// CONNECT BOT
// ==========================================

function connectBot() {
  if (stopping || bot) return;

  generation++;
  const id = generation;

  log('Connecting to Minecraft...');

  try {
    bot = mineflayer.createBot({
      host: CONFIG.host,
      port: CONFIG.port,
      username: CONFIG.username,
      version: CONFIG.version || undefined,
      hideErrors: false
    });

    bot.once('spawn', () => {
      if (id !== generation) return;

      connected = true;
      reconnectAttempts = 0;

      log('Bot successfully spawned!');

      // Join first backend
      currentServerIndex = 0;

      setTimeout(() => {
        if (id !== generation || !connected || !bot) return;

        bot.chat(`/server ${CONFIG.servers[0]}`);
        log(`Joining ${CONFIG.servers[0]}`);
      }, 3000);

      // Start AFK activities
      scheduleSwing(id);
      scheduleLook(id);

      // Rotate between SMP and PvP
      switchTimer = setInterval(
        switchServer,
        CONFIG.switchInterval
      );
    });

    bot.on('kicked', (reason) => {
      lastError = `Kicked: ${JSON.stringify(reason)}`;
      log(lastError);
    });

    bot.on('error', (err) => {
      lastError = err.message;
      log(`Bot error: ${err.message}`);
    });

    bot.once('end', (reason) => {
      if (id !== generation) return;

      log(`Disconnected: ${reason || 'Unknown reason'}`);

      connected = false;
      clearBotTimers();

      bot = null;

      scheduleReconnect();
    });

  } catch (err) {
    lastError = err.message;
    log(`Connection error: ${err.message}`);

    bot = null;
    connected = false;

    scheduleReconnect();
  }
}

// ==========================================
// HTTP HEALTH CHECK
// ==========================================

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'application/json'
  });

  res.end(JSON.stringify({
    status: connected ? 'online' : 'reconnecting',
    username: CONFIG.username,
    backend: connected
      ? CONFIG.servers[currentServerIndex]
      : null,
    reconnectAttempts,
    lastError,
    uptime: Math.floor(process.uptime())
  }));
});

server.listen(CONFIG.httpPort, '0.0.0.0', () => {
  log(`Health check listening on port ${CONFIG.httpPort}`);
});

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

function shutdown() {
  if (stopping) return;

  stopping = true;
  generation++;

  log('Shutting down...');

  clearBotTimers();
  clearTimeout(reconnectTimer);

  if (bot) {
    bot.quit('Bot shutting down');
    bot = null;
  }

  server.close(() => {
    process.exit(0);
  });

  setTimeout(() => process.exit(0), 3000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ==========================================
// START
// ==========================================

log('AFK BOT STARTING');
log(`Target servers: ${CONFIG.servers.join(' -> ')}`);

connectBot();
