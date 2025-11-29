import { DataSource } from "typeorm";
import path from "path";

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: path.join(__dirname, "../database.sqlite"),
  synchronize: true,
  logging: false,
  entities: [path.join(__dirname, "entities/**/*.{ts,js}")],
  subscribers: [],
  migrations: [],
});
