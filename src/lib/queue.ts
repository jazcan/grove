import { Queue, type ConnectionOptions } from "bullmq";

let connection: ConnectionOptions | null = null;

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
  };
}

function getConnection(): ConnectionOptions | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
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
    notificationQueue = new Queue("grove-notifications", { connection: conn });
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
  const q = getNotificationQueue();
  if (!q) {
    console.info("[queue:dev] skip notification job (no REDIS_URL)", job);
    return;
  }
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
}
