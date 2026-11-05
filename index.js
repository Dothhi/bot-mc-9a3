const mineflayer = require('mineflayer');
const http = require('http');

const CONFIG = {
  host: '9a3.mcsh.gg',
  port: 25565,
  username: 'Bot_AFK_247',
  version: '1.21.11',
  checkTimeoutInterval: 60_000,
  reconnectDelay: 15_000, // Đợi 15 giây trước khi thử kết nối lại
};

let bot = null;
let antiAfkInterval = null;
let reconnectTimeout = null;

function createBot() {
  cleanup();

  console.log('Đang kết nối tới server...');

  try {
    bot = mineflayer.createBot({
      host: CONFIG.host,
      port: CONFIG.port,
      username: CONFIG.username,
      version: CONFIG.version,
      checkTimeoutInterval: CONFIG.checkTimeoutInterval,
      // === CẤU HÌNH TỐI ƯU CHUNK & GIẢM TẢI RAM ===
      viewDistance: 'tiny',        // Ép bot chỉ tải 2 chunks xung quanh
      physicsEnabled: false,       // Tắt tính năng tính toán vật lý (giúp giảm tải CPU cực lớn)
      loadInternalPlugins: true,   // Vẫn giữ plugin nội bộ nhưng giới hạn data
    });
  } catch (err) {
    console.log('Lỗi khởi tạo bot:', err.message);
    scheduleReconnect();
    return;
  }

  bot.once('spawn', () => {
    console.log('Bot đã vào game thành công!');

    // Tối ưu hóa bộ nhớ: Xóa bỏ dữ liệu về các thực thể khác nếu server gửi về
    if (bot.entities) bot.entities = {};
  bot.on('kicked', (reason) => {
    console.log('Bot bị đá khỏi server:', typeof reason === 'object' ? JSON.stringify(reason) : reason);
  });

  bot.on('error', (err) => {
    console.log('Lỗi kết nối:', err.message);
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

createBot();
