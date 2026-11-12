
const mineflayer = require('mineflayer');
const http = require('http');

const CONFIG = {
  host: '9a3smp.mcsh.gg',
  port: 25565,
  reconnect: 30000,
  bots: [
    { username: 'Bot_AFK_247', server: 'smp' },
    { username: 'Bot_AFK_247_2', server: 'pvp' }
  ]
};

const states = {};

function startBot(cfg) {
  let bot = null;
  let retry = null;
  let stopped = false;
  let timers = [];

  function log(msg) {
    console.log(`[${cfg.username}] ${msg}`);
  }

  function later(fn, ms) {
    const t = setTimeout(() => {
      timers = timers.filter(x => x !== t);
      fn();
    }, ms);
    timers.push(t);
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function connect() {
    if (stopped || bot) return;

    states[cfg.username] = 'connecting';

    try {
      const current = mineflayer.createBot({
        host: CONFIG.host,
        port: CONFIG.port,
        username: cfg.username,
        viewDistance: 'tiny',
        checkTimeoutInterval: 60000
      });

      bot = current;

      current.once('spawn', () => {
        if (bot !== current) return;

        states[cfg.username] = 'switching';
        log('Connected');

        later(() => {
          if (bot !== current) return;

          current.chat(`/server ${cfg.server}`);
          log(`Joining ${cfg.server}`);

          states[cfg.username] = `command_sent:${cfg.server}`;

          later(() => {
            if (bot !== current) return;
            startAFK(current);
          }, 8000);
        }, 3000);
      });

      current.on('kicked', reason => {
        log(`Kicked: ${JSON.stringify(reason)}`);
      });

      current.on('error', err => log(err.message));

      current.once('end', () => {
        if (bot !== current) return;

        bot = null;
        states[cfg.username] = 'disconnected';
        clearTimers();

        if (!stopped && !retry) {
          retry = setTimeout(() => {
            retry = null;
            connect();
          }, CONFIG.reconnect);
        }
      });

    } catch (err) {
      log(err.message);
      bot = null;
      states[cfg.username] = 'error';

      retry = setTimeout(() => {
        retry = null;
        connect();
      }, CONFIG.reconnect);
    }
  }

  function startAFK(current) {
    function valid() {
      return bot === current && !stopped;
    }

    function swing() {
      if (!valid()) return;
      try { current.swingArm('right'); } catch {}
      later(swing, 45000 + Math.random() * 15000);
    }

    function look() {
      if (!valid() || !current.entity) return;

      try {
        current.look(
          current.entity.yaw + (Math.random() - 0.5) * 0.8,
          current.entity.pitch + (Math.random() - 0.5) * 0.3,
          true
        );
      } catch {}

      later(look, 60000 + Math.random() * 30000);
    }

    function jump() {
      if (!valid()) return;

      try {
        if (current.entity?.onGround) {
          current.setControlState('jump', true);
          later(() => {
            if (valid()) current.setControlState('jump', false);
          }, 150);
        }
      } catch {}

      later(jump, 90000 + Math.random() * 30000);
    }

    states[cfg.username] = 'AFK';
    later(swing, 10000);
    later(look, 15000);
    later(jump, 30000);
  }

  function stop() {
    stopped = true;
    clearTimers();
    clearTimeout(retry);
    if (bot) bot.quit();
    bot = null;
    states[cfg.username] = 'stopped';
  }

  connect();
  return { stop };
}

// HTTP health server
http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'application/json'
  });

  res.end(JSON.stringify({
    service: 'AFK Manager',
    bots: Object.fromEntries(
      Object.entries(states).map(([name, status]) => [
        name,
        status
      ])
    )
  }));
}).listen(process.env.PORT || 3000, '0.0.0.0');

// Start bots
const bots = CONFIG.bots.map(startBot);

function shutdown() {
  bots.forEach(b => b.stop());
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('AFK Manager started');
