import { Router } from 'express';
import os from 'os';
import { monitorEventLoopDelay } from 'perf_hooks';
import { Registry, collectDefaultMetrics, Gauge } from 'prom-client';
import { getRequestMonitoringSnapshot } from '../utils/reqMonitor';

const router = Router();

// Event loop delay histogram using perf_hooks (nanoseconds)
const eldh = monitorEventLoopDelay({ resolution: 20 });
eldh.enable();
const startedAt = new Date();

// Prometheus registry + default metrics
const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: 'file_upload_server_' });

// Gauges for event loop delay (ms)
const gaugeELMin = new Gauge({ name: 'file_upload_server_event_loop_delay_min_ms', help: 'Event loop delay min (ms)', registers: [registry] });
const gaugeELMax = new Gauge({ name: 'file_upload_server_event_loop_delay_max_ms', help: 'Event loop delay max (ms)', registers: [registry] });
const gaugeELMean = new Gauge({ name: 'file_upload_server_event_loop_delay_mean_ms', help: 'Event loop delay mean (ms)', registers: [registry] });
const gaugeELStd = new Gauge({ name: 'file_upload_server_event_loop_delay_stddev_ms', help: 'Event loop delay stddev (ms)', registers: [registry] });
const gaugeELP50 = new Gauge({ name: 'file_upload_server_event_loop_delay_p50_ms', help: 'Event loop delay p50 (ms)', registers: [registry] });
const gaugeELP90 = new Gauge({ name: 'file_upload_server_event_loop_delay_p90_ms', help: 'Event loop delay p90 (ms)', registers: [registry] });
const gaugeELP99 = new Gauge({ name: 'file_upload_server_event_loop_delay_p99_ms', help: 'Event loop delay p99 (ms)', registers: [registry] });

const nsToMs = (ns: number) => ns / 1e6;

function getEventLoopStats() {
  const min = nsToMs(eldh.min);
  const max = nsToMs(eldh.max);
  const mean = nsToMs(eldh.mean);
  const stddev = nsToMs(eldh.stddev);
  const p50 = nsToMs(eldh.percentile(50));
  const p90 = nsToMs(eldh.percentile(90));
  const p99 = nsToMs(eldh.percentile(99));
  const exceeds = eldh.exceeds; // number of times delay exceeded the threshold
  return { min, max, mean, stddev, p50, p90, p99, exceeds };
}

function getProcessStats() {
  const mem = process.memoryUsage();
  const cpu = process.cpuUsage(); // microseconds since process start
  return {
    pid: process.pid,
    node: process.version,
    uptimeSec: process.uptime(),
    memory: {
      rss: mem.rss,
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
      external: mem.external,
      arrayBuffers: (mem as any).arrayBuffers ?? 0,
    },
    cpuMs: {
      user: cpu.user / 1000,
      system: cpu.system / 1000,
    },
  };
}

function getSystemStats() {
  return {
    loadavg: os.loadavg(),
    totalmem: os.totalmem(),
    freemem: os.freemem(),
    platform: os.platform(),
    arch: os.arch(),
  };
}

/**
 * @swagger
 * /monitoring/event-loop:
 *   get:
 *     summary: Récupère des métriques runtime détaillées (event loop, process, système)
 *     tags: [Monitoring]
 *     parameters:
 *       - in: query
 *         name: reset
 *         schema:
 *           type: boolean
 *         description: Si true, réinitialise l'histogramme de la boucle d'événements après lecture
 *     responses:
 *       200:
 *         description: Métriques récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     startedAt:
 *                       type: string
 *                       format: date-time
 *                     eventLoop:
 *                       type: object
 *                       properties:
 *                         min: { type: number }
 *                         max: { type: number }
 *                         mean: { type: number }
 *                         stddev: { type: number }
 *                         p50: { type: number }
 *                         p90: { type: number }
 *                         p99: { type: number }
 *                         exceeds: { type: number }
 *                     process:
 *                       type: object
 *                     system:
 *                       type: object
 */
router.get('/event-loop', (req, res) => {
  const stats = getEventLoopStats();
  const processStats = getProcessStats();
  const systemStats = getSystemStats();

  if (req.query && (req.query as any).reset === 'true') {
    eldh.reset();
  }

  res.json({
    status: 'success',
    data: {
      startedAt: startedAt.toISOString(),
      eventLoop: {
        min: Number(stats.min.toFixed(3)),
        max: Number(stats.max.toFixed(3)),
        mean: Number(stats.mean.toFixed(3)),
        stddev: Number(stats.stddev.toFixed(3)),
        p50: Number(stats.p50.toFixed(3)),
        p90: Number(stats.p90.toFixed(3)),
        p99: Number(stats.p99.toFixed(3)),
        exceeds: stats.exceeds,
      },
      process: processStats,
      system: systemStats,
    },
  });
});

/**
 * @swagger
 * /monitoring/metrics:
 *   get:
 *     summary: Expose les métriques Prometheus
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Texte des métriques Prometheus
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
router.get('/metrics', async (_req, res) => {
  const s = getEventLoopStats();
  gaugeELMin.set(s.min);
  gaugeELMax.set(s.max);
  gaugeELMean.set(s.mean);
  gaugeELStd.set(s.stddev);
  gaugeELP50.set(s.p50);
  gaugeELP90.set(s.p90);
  gaugeELP99.set(s.p99);

  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});

/**
 * @swagger
 * /monitoring/measure:
 *   get:
 *     summary: Mesure les métriques de cette requête (temps, CPU, mémoire, event loop)
 *     tags: [Monitoring]
 *     parameters:
 *       - in: query
 *         name: work
 *         schema:
 *           type: integer
 *           example: 200
 *         description: Durée (ms) d'une charge CPU simulée pour observer l'impact sur la boucle d'événements
 *     responses:
 *       200:
 *         description: Métriques de la requête
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/measure', (req, res) => {
  const workMs = Math.max(0, Number(req.query.work ?? 0));

  const startCpu = process.cpuUsage();
  const startMem = process.memoryUsage();
  const startNs = process.hrtime.bigint();
  const elStart = getEventLoopStats();

  // Charge CPU optionnelle pour générer une latence mesurable
  if (workMs > 0) {
    const endTime = Date.now() + workMs;
    while (Date.now() < endTime) {
      // boucle occupée pour simuler une charge
      Math.sqrt(Math.random() * 1e6);
    }
  }

  const elEnd = getEventLoopStats();
  const endCpu = process.cpuUsage(startCpu); // delta CPU depuis start
  const endMem = process.memoryUsage();
  const endNs = process.hrtime.bigint();

  const durationMs = Number(endNs - startNs) / 1e6;

  res.json({
    status: 'success',
    data: {
      durationMs: Number(durationMs.toFixed(3)),
      cpuMs: { user: endCpu.user / 1000, system: endCpu.system / 1000 },
      memory: {
        rss: endMem.rss,
        heapTotal: endMem.heapTotal,
        heapUsed: endMem.heapUsed,
        external: endMem.external,
        arrayBuffers: (endMem as any).arrayBuffers ?? 0,
        deltaHeapUsed: endMem.heapUsed - startMem.heapUsed,
      },
      eventLoop: {
        start: {
          min: Number(elStart.min.toFixed(3)),
          max: Number(elStart.max.toFixed(3)),
          mean: Number(elStart.mean.toFixed(3)),
          stddev: Number(elStart.stddev.toFixed(3)),
          p50: Number(elStart.p50.toFixed(3)),
          p90: Number(elStart.p90.toFixed(3)),
          p99: Number(elStart.p99.toFixed(3)),
        },
        end: {
          min: Number(elEnd.min.toFixed(3)),
          max: Number(elEnd.max.toFixed(3)),
          mean: Number(elEnd.mean.toFixed(3)),
          stddev: Number(elEnd.stddev.toFixed(3)),
          p50: Number(elEnd.p50.toFixed(3)),
          p90: Number(elEnd.p90.toFixed(3)),
          p99: Number(elEnd.p99.toFixed(3)),
        },
      },
    },
  });
});

/**
 * @swagger
 * /monitoring/measure-sse:
 *   get:
 *     summary: Stream temps réel des métriques de cette requête via SSE
 *     tags: [Monitoring]
 *     parameters:
 *       - in: query
 *         name: interval
 *         schema:
 *           type: integer
 *           example: 500
 *         description: Intervalle d'échantillonnage (ms)
 *       - in: query
 *         name: duration
 *         schema:
 *           type: integer
 *           example: 5000
 *         description: Durée totale du stream (ms)
 *     responses:
 *       200:
 *         description: Flux SSE des métriques
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
router.get('/measure-sse', (req, res) => {
  const interval = Math.max(100, Number(req.query.interval ?? 500));
  const duration = Math.max(interval, Number(req.query.duration ?? 5000));

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let lastCpu = process.cpuUsage();
  const start = Date.now();

  const send = (payload: any) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const timer = setInterval(() => {
    const el = getEventLoopStats();
    const mem = process.memoryUsage();
    const cpuDelta = process.cpuUsage(lastCpu);
    lastCpu = process.cpuUsage();

    send({
      t: Date.now(),
      eventLoop: {
        min: Number(el.min.toFixed(3)),
        max: Number(el.max.toFixed(3)),
        mean: Number(el.mean.toFixed(3)),
        stddev: Number(el.stddev.toFixed(3)),
        p50: Number(el.p50.toFixed(3)),
        p90: Number(el.p90.toFixed(3)),
        p99: Number(el.p99.toFixed(3)),
        exceeds: el.exceeds,
      },
      memory: { rss: mem.rss, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal },
      cpuMs: { user: cpuDelta.user / 1000, system: cpuDelta.system / 1000 },
      uptimeSec: process.uptime(),
    });

    if (Date.now() - start >= duration) {
      clearInterval(timer);
      res.write('event: end\n');
      send({ done: true });
      res.end();
    }
  }, interval);

  req.on('close', () => {
    clearInterval(timer);
  });
});

/**
 * @swagger
 * /monitoring/requests/snapshot:
 *   get:
 *     summary: Snapshot en temps réel des requêtes en cours et de l'état du serveur
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: État courant
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/requests/snapshot', (_req, res) => {
  const snap = getRequestMonitoringSnapshot();
  res.json({ status: 'success', data: snap });
});

/**
 * @swagger
 * /monitoring/requests/stream:
 *   get:
 *     summary: Stream SSE en temps réel des requêtes en cours et de l'état serveur
 *     tags: [Monitoring]
 *     parameters:
 *       - in: query
 *         name: interval
 *         schema:
 *           type: integer
 *           example: 1000
 *         description: Intervalle d'échantillonnage (ms)
 *     responses:
 *       200:
 *         description: Flux SSE
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
router.get('/requests/stream', (req, res) => {
  const interval = Math.max(250, Number(req.query.interval ?? 1000));
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const tick = () => {
    const snap = getRequestMonitoringSnapshot();
    res.write(`data: ${JSON.stringify({ t: Date.now(), ...snap })}\n\n`);
  };

  const timer = setInterval(tick, interval);
  tick(); // premier envoi immédiat

  req.on('close', () => clearInterval(timer));
});

export default router;
