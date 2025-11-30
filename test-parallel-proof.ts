/**
 * PROOF OF CONCEPT TEST
 * This demonstrates that Promise.all fires all operations simultaneously
 */

async function simulateMessage(number: string, index: number): Promise<void> {
  const startTime = Date.now();
  console.log(`[${index}] Message ${number} - STARTED at ${startTime}`);

  // Simulate network delay (50-200ms random)
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 150 + 50));

  const endTime = Date.now();
  console.log(
    `[${index}] Message ${number} - FINISHED at ${endTime} (took ${
      endTime - startTime
    }ms)`
  );
}

async function testParallelSending() {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 TESTING PARALLEL MESSAGE SENDING");
  console.log("We will send 10 messages and measure the timing");
  console.log("If they run in parallel, total time ≈ slowest message time");
  console.log("If they run sequentially, total time = sum of all messages");
  console.log("=".repeat(80) + "\n");

  const testNumbers = [
    "201012345678",
    "201087654321",
    "201098765432",
    "201011111111",
    "201022222222",
    "201033333333",
    "201044444444",
    "201055555555",
    "201066666666",
    "201077777777",
  ];

  const overallStart = Date.now();

  // This is EXACTLY the same pattern as BulkMessageService
  const results = await Promise.all(
    testNumbers.map((number, index) => simulateMessage(number, index))
  );

  const overallEnd = Date.now();
  const totalTime = overallEnd - overallStart;

  console.log("\n" + "=".repeat(80));
  console.log("✅ TEST COMPLETE");
  console.log(`Total Time: ${totalTime}ms`);
  console.log(`Messages Sent: ${testNumbers.length}`);
  console.log(
    `Average per message: ${(totalTime / testNumbers.length).toFixed(2)}ms`
  );
  console.log(
    "\n🎯 PROOF: If total time is ~200ms (not ~1500ms), they ran in PARALLEL!"
  );
  console.log("=".repeat(80) + "\n");
}

// Run the test
testParallelSending().catch(console.error);
