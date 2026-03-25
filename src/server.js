import express from "express";
import dotenv from "dotenv";
import { connectDB, sequelize } from "./config/db.js";
import couponRoutes from "./routes/coupon.routes.js";
import errorHandler from "./middleware/errorHandler.js";
import requestMetrics from "./middleware/requestMetrics.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger/swagger.js";
import { getMetrics, metricsContentType } from "./monitoring/prometheus.js";
import { logger } from "./utils/logger.js";

dotenv.config();

const app = express();

// JSON middleware
app.use(express.json());
app.use(requestMetrics);

app.get("/", (req, res) => {
  res.send("Coupons API is running");
});

// Routes
app.use("/api/coupons", couponRoutes);

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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
      logger.info(`Server running on http://localhost:${PORT}`);
    });

  } catch (error) {
    logger.error("Server failed to start", { error: error.message });
  }
};

startServer();