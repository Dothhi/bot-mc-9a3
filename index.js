const mineflayer = require('mineflayer');
const http = require('http');

const CONFIG = {
  host: '9a3.joinmc.world',
  port: 49414,
  username: 'Bot_AFK_247',
  version: '1.8',
  checkTimeoutInterval: 60_000,
  reconnectDelay: 15_000, // Đợi 15 giây trước khi thử kết nối lại
};

let bot = null;
let antiAfkInterval = null;
let reconnectTimeout = null;

function createBot() {
  // Dọn dẹp bot cũ trước khi tạo kết nối mới
  cleanup();

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
    scheduleReconnect();
    return;
  }

  bot.once('spawn', () => {
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
      } catch (e) {}
    }, 12_000);
  });

  bot.on('kicked', (reason) => {
    console.log('Bot bị đá khỏi server:', typeof reason === 'object' ? JSON.stringify(reason) : reason);
  });

  bot.on('error', (err) => {
    console.log('Lỗi kết nối:', err.message);
    // Khi gặp lỗi mạng nặng (như ECONNREFUSED), sự kiện 'end' có thể không chạy. 
    // Do đó ta chủ động lên lịch kết nối lại ngay tại đây nếu bot chưa kịp spawn.
    if (!bot?.entity) {
      scheduleReconnect();
    }
  });

  bot.on('end', (reason) => {
    console.log(`Mất kết nối (Lý do: ${reason || 'Không xác định'}), đang chuẩn bị vào lại...`);
    scheduleReconnect();
  });
}

function cleanup() {
  if (antiAfkInterval) {
    clearInterval(antiAfkInterval);
    antiAfkInterval = null;
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (bot) {
    try {
      bot.removeAllListeners();
      if (bot._client) {
        bot._client.removeAllListeners();
      }
      bot.quit();
    } catch (e) {}
    bot = null;
  }
}

function scheduleReconnect() {
  // Tránh việc gọi nhiều lịch hẹn trùng nhau
  if (reconnectTimeout) return;

  console.log(`Sẽ thử kết nối lại sau ${CONFIG.reconnectDelay / 1000} giây...`);
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    createBot();
  }, CONFIG.reconnectDelay);
}

// Bắt lỗi toàn cục để app không bị sập trên Render
process.on('uncaughtException', (err) => {
  console.log('Lỗi chưa bắt được:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.log('Promise bị từ chối:', reason);
});

// Keep-alive server cho Render
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is alive');
}).listen(process.env.PORT || 10000, () => {
  console.log('Keep-alive server đang chạy trên cổng', process.env.PORT || 10000);
});

// Khởi chạy bot lần đầu
createBot();
