import { Queue, Worker } from "bullmq";
import Redis from "ioredis";

const connection = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
});

export const flowQueue = new Queue("flow-execution", { connection });

export function startFlowWorker(
  executeNodeCallback: (executionId: string, nodeId: string) => Promise<void>
) {
  const worker = new Worker(
    "flow-execution",
    async (job) => {
      const { executionId, nodeId } = job.data;
      console.log(
        `Processing delayed node execution: ${executionId} - ${nodeId}`
      );
      await executeNodeCallback(executionId, nodeId);
    },
    { connection }
  );

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
  });

  return worker;
}
