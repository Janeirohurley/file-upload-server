import { Request, Response, NextFunction } from 'express';
import { monitorEventLoopDelay } from 'perf_hooks';

// Types
export interface InFlightRecord {
  id: number;
  method: string;
  url: string;
  startAt: number; // Date.now()
  hrStart: bigint; // high-resolution start time
  startCpu: NodeJS.CpuUsage;
  startMem: NodeJS.MemoryUsage;
  ip?: string;
  userAgent?: string;
}

export interface CompletedRecord {
  id: number;
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
  finishedAt: number;
  cpuMs: { user: number; system: number };
  memDeltaBytes: number; // heapUsed delta
  bytesSent?: number;
}

// State
let nextId = 1;
const inFlight = new Map<number, InFlightRecord>();
const recentCompleted: CompletedRecord[] = [];
const RECENT_CAP = 200;

// Event loop delay histogram
const eldh = monitorEventLoopDelay({ resolution: 20 });
eldh.enable();

// CPU snapshot for server-level deltas between snapshots
let lastCpuForSnapshot = process.cpuUsage();
let lastSnapshotAt = Date.now();

// Helpers
const nsToMs = (ns: number) => ns / 1e6;

export function getEventLoopStats() {
  return {
    min: nsToMs(eldh.min),
    max: nsToMs(eldh.max),
    mean: nsToMs(eldh.mean),
    stddev: nsToMs(eldh.stddev),
    p50: nsToMs(eldh.percentile(50)),
    p90: nsToMs(eldh.percentile(90)),
    p99: nsToMs(eldh.percentile(99)),
    exceeds: eldh.exceeds,
  };
}

export function requestMonitorMiddleware(req: Request, res: Response, next: NextFunction) {
  const id = nextId++;
  const record: InFlightRecord = {
    id,
    method: req.method,
    url: (req as any).originalUrl || req.url,
    startAt: Date.now(),
    hrStart: process.hrtime.bigint(),
    startCpu: process.cpuUsage(),
    startMem: process.memoryUsage(),
    ip: req.ip,
    userAgent: req.headers['user-agent'] as string | undefined,
  };

  inFlight.set(id, record);

  const finalize = () => {
    const hrEnd = process.hrtime.bigint();
    const durationMs = Number(hrEnd - record.hrStart) / 1e6;
    const cpu = process.cpuUsage(record.startCpu); // delta since start
    const memNow = process.memoryUsage();
    const memDelta = memNow.heapUsed - record.startMem.heapUsed;
    const statusCode = res.statusCode;
    const lengthHeader = res.getHeader('content-length');
    const bytesSent = typeof lengthHeader === 'string' ? Number(lengthHeader) : typeof lengthHeader === 'number' ? lengthHeader : undefined;

    inFlight.delete(id);

    recentCompleted.push({
      id,
      method: record.method,
      url: record.url,
      statusCode,
      durationMs,
      finishedAt: Date.now(),
      cpuMs: { user: cpu.user / 1000, system: cpu.system / 1000 },
      memDeltaBytes: memDelta,
      bytesSent,
    });
    if (recentCompleted.length > RECENT_CAP) recentCompleted.shift();
  };

  res.on('finish', finalize);
  res.on('close', finalize);

  next();
}

export function getRequestMonitoringSnapshot() {
  // server-level CPU delta since last snapshot
  const now = Date.now();
  const cpuDelta = process.cpuUsage(lastCpuForSnapshot);
  const elapsedMs = now - lastSnapshotAt || 1;
  lastCpuForSnapshot = process.cpuUsage();
  lastSnapshotAt = now;

  const mem = process.memoryUsage();
  const el = getEventLoopStats();

  const inflight = Array.from(inFlight.values()).map(r => ({
    id: r.id,
    method: r.method,
    url: r.url,
    runningForMs: Date.now() - r.startAt,
    ip: r.ip,
    userAgent: r.userAgent,
  }));

  const recent = recentCompleted.slice(-50);

  return {
    timestamp: new Date().toISOString(),
    inFlightCount: inflight.length,
    recentCompletedCount: recent.length,
    inFlight: inflight,
    recentCompleted: recent,
    server: {
      pid: process.pid,
      uptimeSec: process.uptime(),
      cpuDeltaMs: { user: cpuDelta.user / 1000, system: cpuDelta.system / 1000, intervalMs: elapsedMs },
      memory: {
        rss: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
        external: mem.external,
        arrayBuffers: (mem as any).arrayBuffers ?? 0,
      },
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
    },
  };
}

export function getInFlightCount() {
  return inFlight.size;
}
