const mineflayer = require('mineflayer');
const http = require('http');

const config = {
    host: '9a3.joinmc.world', 
    port: 49414,                  
    username: 'Bot_AFK_247',       
    version: '1.21.4'              
};

function createBot() {
    console.log('Đang kết nối bot vào server 9A3...');
    const bot = mineflayer.createBot({
        host: config.host,
        port: config.port,
        username: config.username,
        version: config.version,
        hideErrors: true
    });

    bot.on('spawn', () => {
        console.log(`[${config.username}] Đã vào server 9A3 thành công!`);
        setInterval(() => {
            if (bot && bot.entity) {
                bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 500);
            }
        }, 10000);
    });

    bot.on('end', (reason) => {
        console.log(`Bot rời mạng (Lý do: ${reason}). Sẽ kết nối lại sau 15 giây...`);
        setTimeout(createBot, 15000);
    });

    bot.on('error', (err) => console.log('Lỗi kết nối:', err.message));
}

createBot();

http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bot AFK Server 9A3 đang chạy!');
}).listen(process.env.PORT || 10000);
