import { AppDataSource } from "./data-source";
import { Flow } from "./entities/Flow";

async function testDB() {
  try {
    console.log("Initializing database...");
    await AppDataSource.initialize();
    console.log("Database initialized successfully");

    const flowRepo = AppDataSource.getRepository(Flow);
    const flows = await flowRepo.find();
    console.log(`Found ${flows.length} flows`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testDB();
