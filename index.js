
const mineflayer = require('mineflayer');
const http = require('http');

const CONFIG = {
  host: '9a3smp.mcsh.gg',
  port: 25565,
  version: false,

  bots: [
    {
      username: 'Bot_AFK_247',
      target: 'smp'
    },
    {
      username: 'Bot_AFK_247_2',
      target: 'pvp'
    }
  ],

  reconnectDelay: 15000,
  maxReconnectDelay: 60000,

  switchDelay: 3000,
  healthPort: process.env.PORT || 3000
};

const managers = new Map();

function log(name, message) {
  console.log(
    `[${new Date().toLocaleTimeString()}] [${name}] ${message}`
  );
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

class AFKBot {
  constructor(config) {
    this.config = config;
    this.bot = null;
    this.connected = false;
    this.stopping = false;
    this.attempts = 0;
    this.timers = new Set();
  }

  later(callback, delay) {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delay);

    this.timers.add(timer);
    return timer;
  }

  clearTimers() {
    for (const timer of this.timers) {
      clearTimeout(timer);
    }

    this.timers.clear();
  }

  connect() {
    if (this.stopping || this.bot) return;

    log(this.config.username, 'Connecting to Velocity...');

    try {
      const bot = mineflayer.createBot({
        host: CONFIG.host,
        port: CONFIG.port,
        username: this.config.username,
        version: CONFIG.version || undefined
      });

      this.bot = bot;

      bot.once('spawn', () => {
        if (this.bot !== bot) return;

        this.connected = true;
        this.attempts = 0;

        log(this.config.username, 'Joined Lobby');

        this.later(() => {
          if (this.bot !== bot || !this.connected) return;

          bot.chat(`/server ${this.config.target}`);

          log(
            this.config.username,
            `Joining ${this.config.target}`
          );
        }, CONFIG.switchDelay);

        this.startAFK(bot);
      });

      bot.on('kicked', reason => {
        log(
          this.config.username,
          `Kicked: ${JSON.stringify(reason)}`
        );
      });

      bot.on('error', err => {
        log(this.config.username, `Error: ${err.message}`);
      });

      bot.once('end', reason => {
        if (this.bot !== bot) return;

        log(
          this.config.username,
          `Disconnected: ${reason || 'Unknown'}`
        );

        this.connected = false;
        this.bot = null;
        this.clearTimers();

        this.reconnect();
      });

    } catch (err) {
      log(this.config.username, err.message);
      this.bot = null;
      this.reconnect();
    }
  }

  startAFK(bot) {
    const swing = () => {
      if (!this.connected || this.bot !== bot) return;

      try {
        bot.swingArm('right');
      } catch {}

      this.later(swing, random(20000, 35000));
    };

    const look = () => {
      if (!this.connected || this.bot !== bot) return;

      try {
        const yaw = bot.entity.yaw +
          (Math.random() - 0.5) * 0.8;

        const pitch = Math.max(
          -0.5,
          Math.min(0.5,
            bot.entity.pitch + (Math.random() - 0.5) * 0.3
          )
        );

        bot.look(yaw, pitch, true);
      } catch {}

      this.later(look, random(30000, 50000));
    };

    const jump = () => {
      if (!this.connected || this.bot !== bot) return;

      try {
        // Chỉ nhảy khi đang đứng trên mặt đất.
        if (bot.entity && bot.entity.onGround) {
          bot.setControlState('jump', true);

          this.later(() => {
            if (this.bot === bot) {
              bot.setControlState('jump', false);
            }
          }, 150);
        }
      } catch {}

      this.later(jump, random(60000, 90000));
    };

    this.later(swing, random(5000, 10000));
    this.later(look, random(10000, 15000));
    this.later(jump, random(30000, 45000));
  }

  reconnect() {
    if (this.stopping || this.reconnectTimer) return;

    const delay = Math.min(
      CONFIG.reconnectDelay * Math.pow(1.5, this.attempts++),
      CONFIG.maxReconnectDelay
    );

    log(
      this.config.username,
      `Reconnect in ${Math.round(delay / 1000)}s`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  stop() {
    this.stopping = true;
    this.connected = false;

    clearTimeout(this.reconnectTimer);
    this.clearTimers();

    if (this.bot) {
      this.bot.quit();
      this.bot = null;
    }
  }

  status() {
    return {
      username: this.config.username,
      target: this.config.target,
      status: this.connected ? 'online' : 'offline',
      reconnectAttempts: this.attempts
    };
  }
}

// Start independent bots.
for (const config of CONFIG.bots) {
  const manager = new AFKBot(config);
  managers.set(config.username, manager);
  manager.connect();
}

// HTTP health check.
const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'application/json'
  });

  res.end(JSON.stringify({
    status: 'running',
    bots: [...managers.values()].map(bot => bot.status()),
    uptime: Math.floor(process.uptime())
  }, null, 2));
});

server.listen(CONFIG.healthPort, '0.0.0.0', () => {
  console.log(`Health check: port ${CONFIG.healthPort}`);
});

// Shutdown.
function shutdown() {
  for (const manager of managers.values()) {
    manager.stop();
  }

  server.close();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('Multi-Cluster AFK Manager started!');
