import "dotenv/config";
import prismaPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { syncPostgresDbAliases, buildDatabaseUrl } from "./postgresEnv.js";
import { buildPostgresSsl, logPostgresSsl } from "./postgresSsl.js";

syncPostgresDbAliases(process.env);
logPostgresSsl(process.env);

const { PrismaClient } = prismaPkg;

const connectionString = buildDatabaseUrl(process.env);
const { poolSsl } = buildPostgresSsl(process.env);

const pool = new Pool({
  connectionString,
  ...(poolSsl ? { ssl: poolSsl } : {}),
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
