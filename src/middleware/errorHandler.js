import { observeApiError } from "../monitoring/prometheus.js";
import { logger } from "../utils/logger.js";
import prismaPkg from "@prisma/client";

const { Prisma } = prismaPkg;

const mapPrismaError = (err) => {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return null;

  if (err.code === "P2022") {
    return {
      status: 503,
      code: "DATABASE_SCHEMA_OUT_OF_SYNC",
      userMessage:
        "The database is missing columns the app expects (for example booking rules on coupons). Run the latest migrations on this database, then redeploy.",
      debugMessage: err.message,
    };
  }

  return null;
};

const errorHandler = (err, req, res, next) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const prismaMapped = mapPrismaError(err);
  const status = prismaMapped?.status ?? err.status ?? 500;
  const code = prismaMapped?.code ?? err.code ?? "INTERNAL_ERROR";
  const userMessage =
    prismaMapped?.userMessage ?? err.userMessage ?? undefined;
  const debugMessage =
    prismaMapped?.debugMessage ?? err.message ?? "Internal Server Error";

  observeApiError({
    method: req.method,
    route: req.route?.path || req.path || req.originalUrl,
    statusCode: status,
    code,
  });

  logger.error("[api.error]", {
    requestId,
    method: req.method,
    path: req.originalUrl,
    status,
    code,
    message: err.message,
    prismaCode: err.code,
    meta: err.meta,
  });

  res.status(status).json({
    success: false,
    code,
    message: userMessage || "Something went wrong. Please try again.",
    debugMessage,
    requestId,
    errors: err.errors || null,
    ...(err.meta && { prismaMeta: err.meta }),
  });
};

export default errorHandler;