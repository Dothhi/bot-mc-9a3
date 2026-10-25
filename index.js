const mineflayer = require('mineflayer');
const http = require('http');

const CONFIG = {
  host: '9a3.joinmc.world',
  port: 49414,
  username: 'Bot_AFK_247',
  version: '1.8',
  checkTimeoutInterval: 60_000,
  reconnectDelay: 8_000,   // đợi 8 giây trước khi vào lại
};

let bot = null;
let antiAfkInterval = null;
let reconnecting = false;

function createBot() {
  if (reconnecting) return;
  reconnecting = true;

  console.log('Đang kết nối...');

  bot = mineflayer.createBot({
    host: CONFIG.host,
    port: CONFIG.port,
    username: CONFIG.username,
    version: CONFIG.version,
    checkTimeoutInterval: CONFIG.checkTimeoutInterval,
  });

  bot.once('spawn', () => {
    reconnecting = false;
    console.log('Bot online!');

    // Anti-AFK mạnh hơn
    if (antiAfkInterval) clearInterval(antiAfkInterval);

    antiAfkInterval = setInterval(() => {
      if (!bot?.entity) return;

      // Nhảy
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 300);

      // Nhìn xung quanh một chút
      const yaw = bot.entity.yaw + (Math.random() - 0.5) * 1.2;
      bot.look(yaw, bot.entity.pitch, true);

      // Thỉnh thoảng đi tới 1 bước
      if (Math.random() < 0.3) {
        bot.setControlState('forward', true);
        setTimeout(() => bot.setControlState('forward', false), 400);
      }
    }, 12_000); // mỗi 12 giây
  });

  bot.on('kicked', (reason) => {
    console.log('Kick:', typeof reason === 'object' ? JSON.stringify(reason) : reason);
  });

  bot.on('error', (err) => {
    console.log('Lỗi:', err.message);
  });

  bot.on('end', () => {
    console.log('Mất kết nối, đang vào lại...');
    cleanup();
    setTimeout(createBot, CONFIG.reconnectDelay);
  });
}

function cleanup() {
  if (antiAfkInterval) {
    clearInterval(antiAfkInterval);
    antiAfkInterval = null;
  }
  if (bot) {
    bot.removeAllListeners();
    bot = null;
  }
  reconnecting = false;
}

// Keep-alive cho Render
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is alive');
}).listen(process.env.PORT || 10000, () => {
  console.log('Keep-alive server running');
});

// Bắt đầu
createBot();
