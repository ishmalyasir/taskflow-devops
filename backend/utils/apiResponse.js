class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function sendSuccess(res, data, statusCode = 200, meta = {}) {
  return res.status(statusCode).json({ success: true, data, ...meta });
}

module.exports = { ApiError, sendSuccess };
