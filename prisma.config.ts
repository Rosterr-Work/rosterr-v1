import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const connection = { url: env("DATABASE_URL") };

export default defineConfig({
  datasource: connection,
  migrations: { path: "prisma/migrations" },
  schema: "prisma/schema.prisma",
});
