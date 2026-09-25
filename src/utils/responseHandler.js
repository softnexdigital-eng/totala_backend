/**
 * Standardized API response handler
 * All responses follow this format:
 * { success, message, data, error }
 */

export const sendSuccess = (res, message, data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    error: null
  })
}

export const sendError = (res, message, error = null, statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    error: error instanceof Error ? error.message : error
  })
}
