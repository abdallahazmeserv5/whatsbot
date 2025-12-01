import { DataSource } from "typeorm";
import { Flow } from "./entities/Flow";
import { FlowExecution } from "./entities/FlowExecution";
import { Contact } from "./entities/Contact";
import { AutoReplyConfig } from "./entities/AutoReplyConfig";
// Import any other entities you have

export const AppDataSource = new DataSource({
  type: "postgres",
  url: "postgresql://neondb_owner:npg_zEyM1vm4TBeQ@ep-cold-heart-agssk8jd-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  synchronize: true, // Auto-create tables for new entities
  logging: false,
  entities: [
    Flow,
    FlowExecution,
    Contact,
    AutoReplyConfig,
    // Add any other entities here
  ],
  subscribers: [],
  migrations: [],
  ssl: {
    rejectUnauthorized: false,
  },
});
