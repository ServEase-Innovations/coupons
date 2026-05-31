module.exports = {
  apps: [
    {
      name: "coupons",
      script: "src/server.js",
      env: { NODE_ENV: "production" },
    },
  ],
};
