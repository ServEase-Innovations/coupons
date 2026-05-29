import "dotenv/config";
import prismaPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const { PrismaClient } = prismaPkg;

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const host = process.env.DB_HOST || process.env.POSTGRES_HOST || "13.126.11.184";
  const port = process.env.DB_PORT || process.env.POSTGRES_PORT || "5432";
  const user = process.env.DB_USER || process.env.POSTGRES_USER || "serveaso";
  const password =
    process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || "serveaso";
  const dbName = process.env.DB_NAME || process.env.POSTGRES_DB || "serveaso";
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(
    password
  )}@${host}:${port}/${dbName}`;
}

const connectionString = buildDatabaseUrl();

const pool = new Pool({
  connectionString,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
