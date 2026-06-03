import "dotenv/config";
import prismaPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { syncPostgresDbAliases, buildDatabaseUrl } from "./postgresEnv.js";

syncPostgresDbAliases(process.env);

const { PrismaClient } = prismaPkg;

const connectionString = buildDatabaseUrl(process.env);

const pool = new Pool({
  connectionString,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
