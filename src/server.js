import express from "express";
import cors from "cors";
import { connectDB, sequelize } from "./config/db.js";
import couponRoutes from "./routes/coupon.routes.js";
import errorHandler from "./middleware/errorHandler.js";
import requestMetrics from "./middleware/requestMetrics.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger/swagger.js";
import { resolveSwaggerServerUrl } from "./utils/swaggerServerUrl.js";
import { getMetrics, metricsContentType } from "./monitoring/prometheus.js";
import { logger } from "./utils/logger.js";

const app = express();

const isProduction = process.env.NODE_ENV === "production";

const getAllowedOrigins = () => {
  const raw =
    process.env.CORS_ORIGINS ||
    process.env.ALLOWED_ORIGINS ||
    process.env.APP_URL ||
    "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

const allowedOrigins = getAllowedOrigins();

if (isProduction && allowedOrigins.length === 0) {
  throw new Error(
    "CORS_ORIGINS is required when NODE_ENV=production (comma-separated web/mobile origins)"
  );
}

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.length === 0) return cb(null, true);
      return cb(null, allowedOrigins.includes(origin) || allowedOrigins.includes("*"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
    credentials: true,
    optionsSuccessStatus: 204,
  })
);

// JSON middleware
app.use(express.json());
app.use(requestMetrics);

app.get("/", (req, res) => {
  res.send("Coupons API is running");
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "coupons",
    uptime: process.uptime(),
  });
});

app.get("/ready", async (_req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({ status: "ready", service: "coupons" });
  } catch (error) {
    res.status(503).json({
      status: "not_ready",
      service: "coupons",
      error: error?.message || "database unreachable",
    });
  }
});

// Routes
app.use("/api/coupons", couponRoutes);

// Swagger UI — server URL follows the request (EC2 / ALB / nginx) unless APP_URL etc. is set
app.use("/api-docs", swaggerUi.serve);
app.get("/api-docs", (req, res, next) => {
  const spec = JSON.parse(JSON.stringify(swaggerSpec));
  spec.servers = [{ url: resolveSwaggerServerUrl(req) }];
  swaggerUi.setup(spec)(req, res, next);
});

app.get("/api-docs.json", (req, res) => {
  const spec = JSON.parse(JSON.stringify(swaggerSpec));
  spec.servers = [{ url: resolveSwaggerServerUrl(req) }];
  res.json(spec);
});

app.get("/metrics", async (req, res, next) => {
  try {
    res.set("Content-Type", metricsContentType);
    res.end(await getMetrics());
  } catch (error) {
    next(error);
  }
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    // Do not sequelize.sync() on shared DB — use monorepo: npm run db:migrate
    if (process.env.COUPONS_SEQUELIZE_SYNC === "true") {
      await sequelize.sync();
      logger.warn("COUPONS_SEQUELIZE_SYNC=true — only coupon Sequelize models were synced");
    }

    app.listen(PORT, () => {
      logger.info("Server running", {
        port: PORT,
        corsAllowedOrigins: allowedOrigins.length ? allowedOrigins : ["*"],
        appUrl: process.env.APP_URL || null,
      });
    });

  } catch (error) {
    logger.error("Server failed to start", { error: error.message });
  }
};

startServer();