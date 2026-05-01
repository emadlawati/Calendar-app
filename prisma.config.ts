import { config } from "dotenv";
import path from "path";
import { defineConfig } from "prisma/config";

// Prefer .env.local if it exists (Vercel standard)
config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"] || process.env["POSTGRES_PRISMA_URL"] || "",
  },
});
