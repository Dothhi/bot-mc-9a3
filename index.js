const mineflayer = require('mineflayer');
const http = require('http');

const config = {
  host: '9a3.joinmc.world',
  port: 49414,
  username: 'Bot_AFK_247',
  version: '1.21.4',          // hoặc thử false để auto-detect
  // auth: 'offline'          // bỏ comment nếu server offline-mode
};

function createBot() {
  console.log('Đang kết nối bot vào server 9A3...');
  
  const bot = mineflayer.createBot({
    host: config.host,
    port: config.port,
    username: config.username,
    version: config.version,
    hideErrors: false,
    checkTimeoutInterval: 60 * 1000, // tăng lên 60s
  });

  bot.on('login', () => {
    console.log(`[${config.username}] Đã login`);
  });

  bot.on('spawn', () => {
    console.log(`[${config.username}] Đã vào server 9A3 thành công!`);
    
    // Anti-AFK mạnh hơn
    setInterval(() => {
      if (!bot.entity) return;
      
      // Nhảy
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 400);
      
      // Xoay đầu ngẫu nhiên
      bot.look(
        bot.entity.yaw + (Math.random() - 0.5) * 0.8,
        bot.entity.pitch + (Math.random() - 0.5) * 0.3,
        true
      );
    }, 8000 + Math.random() * 4000);
  });

  bot.on('kicked', (reason, loggedIn) => {
    console.log('=== BỊ KICK ===');
    console.log('Lý do:', reason);
    console.log('Đã login chưa:', loggedIn);
  });

  bot.on('end', (reason) => {
    console.log(`Bot rời mạng (Lý do: ${reason}). Sẽ kết nối lại sau 10 giây...`);
    setTimeout(createBot, 10000);
  });

  bot.on('error', (err) => {
    console.log('Lỗi kết nối:', err.message);
  });
}

createBot();

// Keep-alive cho Render
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Bot AFK Server 9A3 đang chạy!');
}).listen(process.env.PORT || 10000);
