const { ApiError } = require("../utils/apiResponse");

// Catches requests to routes that don't exist and forwards a 404 ApiError.
function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Final error handler. Normalizes Mongoose/JWT/custom errors into the
// { success: false, message } shape used across the whole API.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err instanceof ApiError ? err.statusCode : res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || "Server error";

  // Mongoose bad ObjectId. Only treat it as "not found" when the cast failed
  // on a route param (e.g. GET /api/tasks/:id) — a malformed id in the
  // request BODY (e.g. an invalid "assignee" when creating a task) is a
  // client input error, not a missing resource, so that stays a 400.
  if (err.name === "CastError" && err.kind === "ObjectId") {
    const isRouteParam = Object.values(req.params || {}).includes(String(err.value));
    if (isRouteParam) {
      statusCode = 404;
      message = "Resource not found";
    } else {
      statusCode = 400;
      message = `Invalid value for "${err.path}" — expected a valid ID`;
    }
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `${field} already in use` : "Duplicate value";
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
}

module.exports = { notFound, errorHandler };
