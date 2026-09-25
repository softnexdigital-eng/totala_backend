/**
 * Global error handler middleware
 * Catches all errors passed via next(error) and sends standardized response
 */
const errorHandler = (err, req, res, next) => {
  console.error(err)

  // Handle multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'ফাইলটি খুব বড় (সর্বোচ্চ ১০MB পর্যন্ত)',
      data: null,
      error: err.code
    })
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'একবারে এক বাঁধি ফাইল পাঠাতে হবে',
      data: null,
      error: err.code
    })
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'আপল্যান্ড ফাইল ফিল্ড ভিন্ন',
      data: null,
      error: err.code
    })
  }

  const statusCode = err.statusCode || 500
  const message = err.message || 'সার্ভারের ভেতরে একটি ত্রুটি ঘটেছে'

  res.status(statusCode).json({
    success: false,
    message: message,
    data: null,
    error: process.env.NODE_ENV === 'development' ? err.stack : null
  })
}

export default errorHandler
