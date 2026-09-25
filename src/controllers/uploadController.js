import { sendSuccess, sendError } from '../utils/responseHandler.js'

/**
 * Upload Controller - handles file uploads for prescriptions, receipts, and reports
 */

/**
 * Upload a single file
 * POST /api/upload/single
 * Query: ?type=prescriptions|receipts|reports
 * File: 'file' field
 */
export const uploadSingleFile = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'কোনো ফাইল আপলোড করা হয়নি', 'No file uploaded', 400)
    }

    const fileUrl = `/uploads/${getFileTypeFromPath(req.file.path)}/${req.file.filename}`

    return sendSuccess(res, 'ফাইল আপলোড সফল', {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      url: fileUrl
    }, 201)
  } catch (error) {
    return sendError(res, 'ফাইল আপলোড করতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Upload multiple files
 * POST /api/upload/multiple
 * Query: ?type=prescriptions|receipts|reports
 * File: 'files' field (array)
 */
export const uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return sendError(res, 'কোনো ফাইল আপলোড করা হয়নি', 'No files uploaded', 400)
    }

    const files = req.files.map((file) => {
      const fileUrl = `/uploads/${getFileTypeFromPath(file.path)}/${file.filename}`
      return {
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        url: fileUrl
      }
    })

    return sendSuccess(res, `${files.length}টি ফাইল আপলোড সফল`, files, 201)
  } catch (error) {
    return sendError(res, 'ফাইল আপলোড করতে সমস্যা হয়েছে', error.message)
  }
}

/**
 * Extract file type from path
 * @param {string} filePath - Full file path
 */
const getFileTypeFromPath = (filePath) => {
  if (filePath.includes('prescriptions')) return 'prescriptions'
  if (filePath.includes('receipts')) return 'receipts'
  return 'reports'
}
