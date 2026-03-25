import swaggerJSDoc from "swagger-jsdoc";
import "./coupons.swagger.js"; // Import the file containing Swagger annotations

const baseUrl =
  process.env.APP_URL ||
  process.env.BASE_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  "http://localhost:3000";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Coupons API",
      version: "1.0.0",
      description: "API documentation for Coupons service"
    },
    servers: [
      {
        url: baseUrl
      }
    ]
  },

  // IMPORTANT
  apis: ["./src/swagger/*.js"]
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;