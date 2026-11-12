const mineflayer = require('mineflayer');
const http = require('http');

const CONFIG = {
  host: '9a3smp.mcsh.gg',
  port: 25565,
  username: 'Bot_AFK_247',
  version: '1.20',
  targetServer: 'smp', // <-- Đổi tên server con của bạn ở đây
  reconnectDelay: 15000,
  maxSessionDuration: 20 * 60 * 1000, // 20 phút tính bằng mili-giây
};

let bot = null;
let reconnectTimeout = null;
let sessionTimeout = null; // Biến lưu bộ đếm 20 phút

function createBot() {
  if (bot) {
    try {
      bot.removeAllListeners();
      bot.quit();
    } catch {}
    bot = null;
  }

  // Xóa bộ đếm 20p cũ nếu có
  if (sessionTimeout) {
    clearTimeout(sessionTimeout);
    sessionTimeout = null;
  }

  console.log('Đang kết nối...');

  bot = mineflayer.createBot({
    host: CONFIG.host,
    port: CONFIG.port,
    username: CONFIG.username,
    version: CONFIG.version,
    viewDistance: 'tiny',
    physicsEnabled: false,
  });

  // Dùng .once nên lệnh này chỉ chạy 1 lần duy nhất lúc mới vào sảnh đầu tiên
  bot.once('spawn', () => {
    console.log('Bot đã vào sảnh, chờ 3s để chuyển server...');
    if (bot.entities) bot.entities = {};

    setTimeout(() => {
      if (bot) {
        bot.chat(`/server ${CONFIG.targetServer}`);
        console.log(`Đã gửi lệnh: /server ${CONFIG.targetServer}`);
      }
    }, 3000);

    // Bắt đầu đếm ngược 20 phút sau khi bot spawn thành công để tự thoát và vào lại
    sessionTimeout = setTimeout(() => {
      console.log('Đã chạy đủ 20 phút, tiến hành thoát để kết nối lại...');
      if (bot) {
        try {
          bot.quit();
        } catch {}
      }
    }, CONFIG.maxSessionDuration);
  });

  bot.on('kicked', (reason) => {
    console.log('Bị kick:', typeof reason === 'object' ? JSON.stringify(reason) : reason);
  });

  bot.on('error', (err) => {
    console.log('Lỗi:', err.message);
  });

  bot.on('end', () => {
    console.log('Mất kết nối, sẽ vào lại sau 15s...');
    // Dọn dẹp bộ đếm phiên khi bot ngắt kết nối
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
      sessionTimeout = null;
    }
    scheduleReconnect();
  });
}

function scheduleReconnect() {
  if (reconnectTimeout) return;
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    createBot();
  }, CONFIG.reconnectDelay);
}

process.on('uncaughtException', (err) => console.log('Uncaught:', err.message));
process.on('unhandledRejection', (reason) => console.log('Rejection:', reason));

http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is alive');
}).listen(process.env.PORT || 10000, () => {
  console.log('Keep-alive chạy trên cổng', process.env.PORT || 10000);
});

createBot();
