const mineflayer = require('mineflayer');
const http = require('http');

const CONFIG = {
  host: '9a3.joinmc.world',
  port: 49414,
  username: 'Bot_AFK_247',
  version: '1.8',
  checkTimeoutInterval: 60_000,
  reconnectDelay: 15_000, // Tăng lên 15 giây để chờ server kịp mở lại khi bị ECONNREFUSED
};

let bot = null;
let antiAfkInterval = null;
let reconnecting = false;
let reconnectTimeout = null;

function createBot() {
  if (reconnecting) return;
  reconnecting = true;

  console.log('Đang kết nối tới server...');

  try {
    bot = mineflayer.createBot({
      host: CONFIG.host,
      port: CONFIG.port,
      username: CONFIG.username,
      version: CONFIG.version,
      checkTimeoutInterval: CONFIG.checkTimeoutInterval,
    });
  } catch (err) {
    console.log('Lỗi khởi tạo bot:', err.message);
    reconnecting = false;
    scheduleReconnect();
    return;
  }

  bot.once('spawn', () => {
    reconnecting = false;
    console.log('Bot đã vào game thành công!');

    // Anti-AFK
    if (antiAfkInterval) clearInterval(antiAfkInterval);

    antiAfkInterval = setInterval(() => {
      if (!bot || !bot.entity) return;

      try {
        // Nhảy
        bot.setControlState('jump', true);
        setTimeout(() => {
          if (bot) bot.setControlState('jump', false);
        }, 300);

        // Nhìn xung quanh một chút
        const yaw = bot.entity.yaw + (Math.random() - 0.5) * 1.2;
        bot.look(yaw, bot.entity.pitch, true);

        // Thỉnh thoảng đi tới 1 bước
        if (Math.random() < 0.3) {
          bot.setControlState('forward', true);
          setTimeout(() => {
            if (bot) bot.setControlState('forward', false);
          }, 400);
        }
      } catch (e) {
        // Bỏ qua lỗi nhỏ khi thực hiện anti-afk lúc bot đang mất kết nối
      }
    }, 12_000);
  });

  bot.on('kicked', (reason) => {
    console.log('Bot bị đá khỏi server:', typeof reason === 'object' ? JSON.stringify(reason) : reason);
  });

  bot.on('error', (err) => {
    console.log('Lỗi kết nối:', err.message);
  });

  bot.on('end', (reason) => {
    console.log(`Mất kết nối (Lý do: ${reason}), đang chuẩn bị vào lại...`);
    cleanup();
    scheduleReconnect();
  });
}

function cleanup() {
  if (antiAfkInterval) {
    clearInterval(antiAfkInterval);
    antiAfkInterval = null;
  }
  if (bot) {
    try {
      bot.removeAllListeners();
      if (bot._client) {
        bot._client.removeAllListeners();
      }
    } catch (e) {}
    bot = null;
  }
  reconnecting = false;
}

function scheduleReconnect() {
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  reconnectTimeout = setTimeout(() => {
    createBot();
  }, CONFIG.reconnectDelay);
}

// Bắt các lỗi toàn cục để ứng dụng trên Render không bị sập (crash)
process.on('uncaughtException', (err) => {
  console.log('Lỗi chưa bắt được (Uncaught Exception):', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.log('Promise bị từ chối:', reason);
});

// Keep-alive server cho Render (tránh bị ngủ đông nếu dùng bản free)
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is alive');
}).listen(process.env.PORT || 10000, () => {
  console.log('Keep-alive server đang chạy trên cổng', process.env.PORT || 10000);
});

// Khởi chạy bot lần đầu
createBot();
