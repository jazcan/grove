import { Worker, type ConnectionOptions } from "bullmq";
import { brand } from "../config/brand";
import { processNotificationJob } from "../domain/notifications/process-job";

const url = process.env.REDIS_URL;
if (!url) {
  console.error("REDIS_URL is required to run the worker.");
  process.exit(1);
}

function parseRedisUrl(input: string): ConnectionOptions {
  const u = new URL(input);
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

const connection = parseRedisUrl(url);

const worker = new Worker(
  "grove-notifications",
  async (job) => {
    const bookingId = job.data.bookingId as string;
    if (job.name === "booking_confirmation") {
      await processNotificationJob({ kind: "booking_confirmation", bookingId });
    } else if (job.name === "booking_reminder") {
      await processNotificationJob({ kind: "booking_reminder", bookingId });
    } else if (job.name === "booking_followup") {
      await processNotificationJob({ kind: "booking_followup", bookingId });
    }
  },
  { connection }
);

worker.on("failed", (job, err) => {
  console.error("Job failed", job?.id, err);
});

console.log(`${brand.appName} notification worker started.`);
