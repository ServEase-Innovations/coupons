import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const dbHost = process.env.DB_HOST || process.env.POSTGRES_HOST || "13.126.11.184";
const dbPort = Number(process.env.DB_PORT || process.env.POSTGRES_PORT || 5432);
const dbUser =
  process.env.DB_USER || process.env.POSTGRES_USER || "serveaso";
const dbPassword =
  process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || "serveaso";
const dbName = process.env.DB_NAME || process.env.POSTGRES_DB || "serveaso";

export const sequelize = new Sequelize(
  dbName,
  dbUser,
  dbPassword,
  {
    host: dbHost,
    port: dbPort,
    dialect: "postgres",

    logging: false, // change to console.log if debugging

    pool: {
      max: 10,        // max connections
      min: 0,
      acquire: 30000, // max time (ms) to get connection
      idle: 10000,    // max time (ms) connection can be idle
    },

    dialectOptions: isProduction
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},

    define: {
      freezeTableName: true, // prevents plural table names
      timestamps: false,
    },
  }
);

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log(
      `✅ Coupons DB connected: host=${dbHost} port=${dbPort} db=${dbName} user=${dbUser}`
    );
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
};