import "dotenv/config";
import prismaPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { syncPostgresDbAliases, buildDatabaseUrl } = require("../../../../scripts/postgres-env.cjs");

syncPostgresDbAliases(process.env);

const { PrismaClient } = prismaPkg;

const connectionString = buildDatabaseUrl(process.env);

const pool = new Pool({
  connectionString,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
