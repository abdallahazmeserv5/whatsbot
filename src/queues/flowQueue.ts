import { Queue, Worker } from "bullmq";
import Redis from "ioredis";

const enableRedis = process.env.ENABLE_REDIS === "true";

// create the connection only if enabled
const connection = enableRedis
  ? new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      maxRetriesPerRequest: null,
    })
  : null;

// ---- QUEUE ---- //
export const flowQueue = enableRedis
  ? new Queue("flow-execution", { connection: connection! })
  : null;

// ---- WORKER ---- //
export function startFlowWorker(
  executeNodeCallback: (executionId: string, nodeId: string) => Promise<void>
) {
  if (!enableRedis) {
    console.log("Redis disabled — worker not started.");
    return null;
  }

  const worker = new Worker(
    "flow-execution",
    async (job) => {
      const { executionId, nodeId } = job.data;
      console.log(
        `Processing delayed node execution: ${executionId} - ${nodeId}`
      );
      await executeNodeCallback(executionId, nodeId);
    },
    { connection: connection! }
  );

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
  });

  return worker;
}
