import swaggerJSDoc from "swagger-jsdoc";
import "./coupons.swagger.js"; // Import the file containing Swagger annotations

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
        url: "http://localhost:3000"
      }
    ]
  },

  // IMPORTANT
  apis: ["./src/swagger/*.js"]
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;