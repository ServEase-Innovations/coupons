import express from "express";
import dotenv from "dotenv";
import { connectDB, sequelize } from "./config/db.js";
import couponRoutes from "./routes/coupon.routes.js";
import errorHandler from "./middleware/errorHandler.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger/swagger.js";

dotenv.config();

const app = express();

// JSON middleware
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Coupons API is running");
});

// Routes
app.use("/api/coupons", couponRoutes);

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    await sequelize.sync();

    console.log("Tables created successfully");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error("Server failed to start:", error.message);
  }
};

startServer();