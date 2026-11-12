
const mineflayer = require('mineflayer');

const CONFIG = {
  host: '9a3smp.mcsh.gg',
  port: 25565,
  version: false,

  reconnect: 30000,

  bots: [
    { username: 'Bot_AFK_247', server: 'smp' },
    { username: 'Bot_AFK_247_2', server: 'pvp' }
  ]
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function startBot(config) {
  let bot = null;
  let retry = null;
  let stopped = false;
  let generation = 0;
  let timers = [];

  function log(message) {
    console.log(`[${config.username}] ${message}`);
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function later(fn, ms) {
    const timer = setTimeout(() => {
      timers = timers.filter(t => t !== timer);
      fn();
    }, ms);

    timers.push(timer);
  }

  function connect() {
    if (stopped || bot) return;

    const id = ++generation;

    try {
      log('Connecting...');

      const current = mineflayer.createBot({
        host: CONFIG.host,
        port: CONFIG.port,
        username: config.username,
        version: CONFIG.version || undefined,
        viewDistance: 2,
        checkTimeoutInterval: 60000
      });

      bot = current;

      current.once('spawn', async () => {
        if (bot !== current || id !== generation) return;

        log('Connected to Lobby');

        await sleep(3000);

        if (bot !== current || id !== generation) return;

        current.chat(`/server ${config.server}`);
        log(`Joining ${config.server}`);

        // Wait for backend transfer before AFK actions.
        later(() => {
          if (bot !== current || id !== generation) return;
          startAFK(current, id);
        }, 8000);
      });

      current.on('kicked', reason => {
        log(`Kicked: ${JSON.stringify(reason)}`);
      });

      current.on('error', err => {
        log(`Error: ${err.message}`);
      });

      current.once('end', () => {
        if (bot !== current || id !== generation) return;

        bot = null;
        clearTimers();

        log('Disconnected');

        if (!stopped && !retry) {
          retry = setTimeout(() => {
            retry = null;
            connect();
          }, CONFIG.reconnect);
        }
      });

    } catch (err) {
      log(`Connection error: ${err.message}`);
      bot = null;

      if (!retry && !stopped) {
        retry = setTimeout(() => {
          retry = null;
          connect();
        }, CONFIG.reconnect);
      }
    }
  }

  function startAFK(current, id) {
    function valid() {
      return bot === current && generation === id && !stopped;
    }

    function swing() {
      if (!valid()) return;

      try {
        current.swingArm('right');
      } catch {}

      later(swing, 45000 + Math.random() * 15000);
    }

    function look() {
      if (!valid() || !current.entity) return;

      try {
        const yaw = current.entity.yaw +
          (Math.random() - 0.5) * 0.8;

        const pitch = Math.max(-0.4, Math.min(
          0.4,
          current.entity.pitch + (Math.random() - 0.5) * 0.3
        ));

        current.look(yaw, pitch, true);
      } catch {}

      later(look, 60000 + Math.random() * 30000);
    }

    function jump() {
      if (!valid()) return;

      try {
        if (current.entity && current.entity.onGround) {
          current.setControlState('jump', true);

          later(() => {
            if (valid()) current.setControlState('jump', false);
          }, 150);
        }
      } catch {}

      later(jump, 90000 + Math.random() * 30000);
    }

    later(swing, 10000);
    later(look, 15000);
    later(jump, 30000);
  }

  function stop() {
    stopped = true;
    generation++;

    clearTimers();
    clearTimeout(retry);

    if (bot) {
      bot.quit();
      bot = null;
    }
  }

  connect();

  return { stop };
}

// Start two independent bots.
const bots = CONFIG.bots.map(startBot);

function shutdown() {
  bots.forEach(bot => bot.stop());
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('AFK Manager started: 2 bots');
