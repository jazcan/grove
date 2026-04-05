import { Queue, type ConnectionOptions } from "bullmq";

let connection: ConnectionOptions | null = null;

/** After a connection failure, skip BullMQ until process restart (avoids ECONNREFUSED spam when REDIS_URL points at nothing). */
let redisUnreachable = false;
let redisUnreachableLogged = false;

function isRedisConnectionError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as NodeJS.ErrnoException & { errors?: unknown[]; name?: string };
  if (
    err.code === "ECONNREFUSED" ||
    err.code === "ECONNRESET" ||
    err.code === "ETIMEDOUT" ||
    err.code === "ENOTFOUND"
  ) {
    return true;
  }
  if (err.name === "AggregateError" && Array.isArray(err.errors)) {
    return err.errors.some((sub) => isRedisConnectionError(sub));
  }
  return false;
}

async function disableNotificationQueue(reason: string, err: unknown): Promise<void> {
  if (redisUnreachable) return;
  redisUnreachable = true;
  const q = notificationQueue;
  notificationQueue = null;
  if (q) {
    try {
      await q.close();
    } catch {
      /* ignore */
    }
  }
  if (!redisUnreachableLogged) {
    redisUnreachableLogged = true;
    console.warn(
      `[queue] ${reason} — notification jobs disabled until restart. Start Redis or unset REDIS_URL for local dev.`,
      err
    );
  }
}

function parseRedisUrl(url: string): ConnectionOptions {
  const u = new URL(url);
  const port = u.port ? Number(u.port) : 6379;
  const db = u.pathname?.length ? Number(u.pathname.replace("/", "")) : 0;
  const password = u.password || undefined;
  const username = u.username || undefined;
  const tls = u.protocol === "rediss:" ? {} : undefined;

  return {
    host: u.hostname,
    port,
    db: Number.isFinite(db) ? db : 0,
    password,
    username,
    tls,
    maxRetriesPerRequest: null,
    // Default ioredis reconnect can fire many attempts per command; cap noise when Redis is down.
    retryStrategy(times: number) {
      return times > 2 ? null : Math.min(times * 100, 500);
    },
  };
}

function getConnection(): ConnectionOptions | null {
  const url = process.env.REDIS_URL;
  if (!url || redisUnreachable) return null;
  if (!connection) {
    connection = parseRedisUrl(url);
  }
  return connection;
}

let notificationQueue: Queue | null = null;

export function getNotificationQueue(): Queue | null {
  const conn = getConnection();
  if (!conn) return null;
  if (!notificationQueue) {
    const q = new Queue("grove-notifications", { connection: conn });
    q.on("error", (err) => {
      if (isRedisConnectionError(err)) {
        void disableNotificationQueue("Redis connection error", err);
      } else {
        console.error("[queue] notification queue error", err);
      }
    });
    notificationQueue = q;
  }
  return notificationQueue;
}

export type NotificationJob = {
  kind: "booking_confirmation" | "booking_reminder" | "booking_followup";
  bookingId: string;
  idempotencyKey: string;
  /** When to run (for delayed reminders); omit for immediate */
  delayMs?: number;
};

export async function enqueueNotification(job: NotificationJob): Promise<void> {
  try {
    const q = getNotificationQueue();
    if (!q) {
      if (!process.env.REDIS_URL?.trim()) {
        console.info("[queue:dev] skip notification job (no REDIS_URL)", job);
      }
      return;
    }
    try {
      await q.add(
        job.kind,
        { bookingId: job.bookingId },
        {
          jobId: job.idempotencyKey,
          delay: job.delayMs ?? 0,
          attempts: 5,
          backoff: { type: "exponential", delay: 3000 },
          removeOnComplete: true,
        }
      );
    } catch (e) {
      // Booking/email must not fail if Redis is misconfigured or unreachable (common on first deploy).
      if (isRedisConnectionError(e)) {
        await disableNotificationQueue("enqueue failed (Redis unreachable)", e);
      } else {
        console.error("[queue] enqueue failed", { kind: job.kind, bookingId: job.bookingId, error: e });
      }
    }
  } catch (e) {
    console.error("[queue] notification setup failed", { kind: job.kind, bookingId: job.bookingId, error: e });
  }
}
