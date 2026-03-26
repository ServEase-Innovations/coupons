import express from "express";
import dotenv from "dotenv";
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

dotenv.config();

const app = express();

const getAllowedOrigins = () => {
  const raw = process.env.CORS_ORIGINS || process.env.APP_URL || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

const allowedOrigins = getAllowedOrigins();

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser requests (curl, server-to-server) with no Origin header
      if (!origin) return cb(null, true);
      // If not configured, allow all origins (useful for local dev)
      if (allowedOrigins.length === 0) return cb(null, true);
      // Otherwise allow only configured origins
      return cb(null, allowedOrigins.includes(origin));
    },
  })
);

// JSON middleware
app.use(express.json());
app.use(requestMetrics);

app.get("/", (req, res) => {
  res.send("Coupons API is running");
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
    await sequelize.sync();

    logger.info("Tables created successfully");

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