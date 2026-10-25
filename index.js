const mineflayer = require('mineflayer');
const http = require('http');

const bot = mineflayer.createBot({
  host: '9a3.joinmc.world',
  port: 49414,
  username: 'Bot_AFK_247',
  version: '1.8',
  checkTimeoutInterval: 60000
});

bot.on('spawn', () => {
  console.log('Bot online!');
  setInterval(() => {
    if (bot.entity) {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 250);
    }
  }, 15000);
});

bot.on('end', () => {
  console.log('Mất kết nối, đang vào lại...');
  setTimeout(() => process.exit(1), 3000); // để Render tự restart
});

bot.on('kicked', (reason) => console.log('Kick:', reason));
bot.on('error', (err) => console.log('Lỗi:', err.message));

// Keep alive cực ngắn
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('ok');
}).listen(process.env.PORT || 10000);
