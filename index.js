
const mineflayer = require('mineflayer');
const http = require('http');

const CONFIG = {
  host: '9a3smp.mcsh.gg',
  port: 25565,
  username: 'Bot_AFK_247',
  version: '1.20',

  targetServer: 'smp',

  reconnectDelay: 15000,
  maxSessionDuration: 20 * 60 * 1000, // 20 phút
  switchDelay: 3000,
};

let bot = null;
let reconnectTimeout = null;
let sessionTimeout = null;
let switchTimeout = null;
let stopping = false;

function clearTimers() {
  if (sessionTimeout) {
    clearTimeout(sessionTimeout);
    sessionTimeout = null;
  }

  if (switchTimeout) {
    clearTimeout(switchTimeout);
    switchTimeout = null;
  }
}

function scheduleReconnect() {
  if (reconnectTimeout || stopping) return;

  console.log(`[RECONNECT] Thử lại sau ${CONFIG.reconnectDelay / 1000}s`);

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    createBot();
  }, CONFIG.reconnectDelay);
}

function createBot() {
  if (stopping || bot) return;

  clearTimers();

  console.log('[BOT] Đang kết nối đến proxy...');

  const currentBot = mineflayer.createBot({
    host: CONFIG.host,
    port: CONFIG.port,
    username: CONFIG.username,
    version: CONFIG.version,
    viewDistance: 'tiny',
    physicsEnabled: false,
  });

  bot = currentBot;

  currentBot.once('login', () => {
    console.log('[BOT] Đăng nhập proxy thành công!');
  });

  currentBot.once('spawn', () => {
    if (bot !== currentBot) return;

    console.log('[BOT] Đã spawn! Đang chờ chuyển server...');

    switchTimeout = setTimeout(() => {
      if (bot !== currentBot) return;

      try {
        currentBot.chat(`/server ${CONFIG.targetServer}`);
        console.log(`[BOT] Đã gửi lệnh /server ${CONFIG.targetServer}`);
      } catch (err) {
        console.log('[SWITCH ERROR]', err.message);
      }
    }, CONFIG.switchDelay);

    sessionTimeout = setTimeout(() => {
      if (bot !== currentBot) return;

      console.log('[SESSION] Đã đủ 20 phút, khởi động lại phiên...');

      try {
        currentBot.quit('Session restart');
      } catch (err) {
        console.log('[QUIT ERROR]', err.message);
      }
    }, CONFIG.maxSessionDuration);
  });

  currentBot.on('kicked', (reason) => {
    console.log('[KICKED]', typeof reason === 'object'
      ? JSON.stringify(reason)
      : reason);
  });

  currentBot.on('error', (err) => {
    console.log('[BOT ERROR]', err.message);
  });

  currentBot.on('end', (reason) => {
    console.log('[BOT END] Kết nối kết thúc:', reason || 'Không rõ lý do');

    clearTimers();

    if (bot === currentBot) {
      bot = null;
    }

    scheduleReconnect();
  });
}

// HTTP Keep-alive
const PORT = Number(process.env.PORT) || 10000;

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'Cache-Control': 'no-store',
  });

  res.end('Minecraft AFK Bot is alive!');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[HTTP] Keep-alive đang chạy tại port ${PORT}`);
});

// Bắt lỗi để ghi log
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err.stack || err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

// Tắt ứng dụng đúng cách khi hosting yêu cầu
function shutdown(signal) {
  if (stopping) return;

  stopping = true;
  console.log(`[SYSTEM] Nhận tín hiệu ${signal}, đang tắt...`);

  clearTimers();

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (bot) {
    try {
      bot.quit('Hosting shutdown');
    } catch {}
    bot = null;
  }

  server.close(() => {
    process.exit(0);
  });

  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

console.log('[SYSTEM] Minecraft AFK Bot starting...');
createBot();
