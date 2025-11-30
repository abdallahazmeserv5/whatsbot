import { DataSource } from "typeorm";
import path from "path";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: "postgresql://neondb_owner:npg_zEyM1vm4TBeQ@ep-cold-heart-agssk8jd-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  synchronize: true, // Auto-create tables for new entities
  logging: false,
  entities: [path.join(__dirname, "entities/**/*.{ts,js}")],
  subscribers: [],
  migrations: [],
  ssl: {
    rejectUnauthorized: false,
  },
});
