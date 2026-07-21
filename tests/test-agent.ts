import dotenv from "dotenv";
dotenv.config();

import { addAgentJob } from "../src/queues/agentQueue";
import { QueueEvents } from "bullmq";
import { connection, isRedisReady } from "../src/queues/connection";

import { getCommandDB } from "../src/lib/mongodb";

async function runTest() {
  console.log("🚀 Submitting a test agent job...");

  const db = await getCommandDB();
  const dummyUser = await db.collection("users").insertOne({
    name: "Test User",
    email: "test@example.com",
    uid: "test-uid-" + Date.now(),
    skills: ["React", "TypeScript", "Node.js"]
  });

  const jobUrl = "https://example.com"; 
  const userId = dummyUser.insertedId.toString();

  try {
    const job = await addAgentJob({
      userId,
      jobUrl,
      action: "fill_application"
    });

    console.log(`✅ Job queued successfully with ID: ${job.id}`);

    if (!isRedisReady()) {
      console.log("⚠️ Redis is offline. Processing the agent job directly in this script instead of waiting for the worker...");
      // Dynamically import the worker and process it manually
      const { initAgentWorker } = await import("../src/workers/applicationAgentWorker");
      const worker = initAgentWorker();
      
      // We manually simulate a job object for the worker to process
      const mockJob: any = {
        data: { userId, jobUrl, action: "fill_application" },
        updateProgress: async (progress: any) => {
          console.log(`[Status Update] ${progress.status}`);
        }
      };
      
      // Expose the processAgentJob logic (we'll need to export it from applicationAgentWorker, or just let the worker pick it up if BullMQ handles fallback. 
      // But BullMQ doesn't do fallback automatically. Let's just mock the execution by calling the worker's processor.
      // Wait, processAgentJob is not exported. Let me just export it in applicationAgentWorker.ts next.
      const { processAgentJob } = await import("../src/workers/applicationAgentWorker");
      await processAgentJob(mockJob);
      
      await db.collection("users").deleteOne({ _id: dummyUser.insertedId });
      
      console.log(`\n🎉 Job ${job.id} completed successfully (Synchronous Fallback)!`);
      process.exit(0);
    } else {
      console.log("📡 Listening for progress updates (ensure 'npm run start:worker' is running in another terminal!)...\n");

      const agentQueueEvents = new QueueEvents("agent-processing", { connection: connection as any });
      
      agentQueueEvents.on("progress", ({ jobId, data }) => {
        if (jobId === job.id) {
          console.log(`[Status Update] ${data.status}`);
        }
      });

      agentQueueEvents.on("completed", async ({ jobId }) => {
        if (jobId === job.id) {
          await db.collection("users").deleteOne({ _id: dummyUser.insertedId });
          console.log(`\n🎉 Job ${jobId} completed successfully!`);
          process.exit(0);
        }
      });

      agentQueueEvents.on("failed", async ({ jobId, failedReason }) => {
        if (jobId === job.id) {
          await db.collection("users").deleteOne({ _id: dummyUser.insertedId });
          console.error(`\n❌ Job ${jobId} failed: ${failedReason}`);
          process.exit(1);
        }
      });
    }

  } catch (err) {
    console.error("Error submitting job:", err);
    process.exit(1);
  }
}

runTest();
