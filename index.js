const mineflayer = require('mineflayer');
const http = require('http');

const config = {
  host: '9a3.joinmc.world',
  port: 49414,
  username: 'Bot_AFK_247',
  version: "1.8",          // hoặc '1.8'
};

function createBot() {
  console.log('Đang kết nối...');
  
  const bot = mineflayer.createBot({
    host: config.host,
    port: config.port,
    username: config.username,
    version: config.version,
    checkTimeoutInterval: 60 * 1000,
  });

  bot.on('spawn', () => {
    console.log(`[${config.username}] Đã vào server thành công!`);
    
    // Anti-AFK nhẹ, ít bị phát hiện
    setInterval(() => {
      if (bot.entity) {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 300);
      }
    }, 12000);
  });

  bot.on('end', (reason) => {
    console.log(`Mất kết nối (${reason}). Kết nối lại sau 5s...`);
    setTimeout(createBot, 5000);
  });

  bot.on('kicked', (reason) => {
    console.log('Bị kick:', reason);
  });

  bot.on('error', (err) => {
    console.log('Lỗi:', err.message);
  });
}

createBot();

http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot đang chạy');
}).listen(process.env.PORT || 10000);
