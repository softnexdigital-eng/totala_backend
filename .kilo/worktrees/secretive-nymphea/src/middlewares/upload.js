import multer from 'multer'
import path from 'path'
import fs from 'fs'

/**
 * Multer upload middleware for file handling
 * Supports prescriptions, receipts, and reports
 */

// Ensure upload directories exist
const uploadBaseDirs = ['prescriptions', 'receipts', 'reports']
const uploadBasePath = 'uploads'

uploadBaseDirs.forEach((dir) => {
  const fullPath = path.join(uploadBasePath, dir)
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true })
  }
})

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine subdirectory based on query param or body type
    const subdir = req.query.type || req.body.type || 'reports'
    const validDirs = ['prescriptions', 'receipts', 'reports']
    const dir = validDirs.includes(subdir) ? subdir : 'reports'
    const fullPath = path.join(uploadBasePath, dir)

    // Ensure directory exists
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true })
    }

    cb(null, fullPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const ext = path.extname(file.originalname)
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`)
  }
})

// File filter - only allow specific file types
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|pdf|doc|docx|dcm/
  const ext = path.extname(file.originalname).toLowerCase()
  const allowedMimeTypes = /jpeg|jpg|png|pdf|doc|docx|dcm/

  if (allowedExtensions.test(ext) && allowedMimeTypes.test(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('ফাইল ফর্ম্যাট সমর্থন করা হয় না (অনুমোদিত: jpeg, jpg, png, pdf, doc, docx, dcm)'), false)
  }
}

// Initialize multer with limits
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter
})

export const uploadSingle = upload.single('file')
export const uploadMultiple = upload.array('files', 5)
export const uploadAny = upload.any()

export default upload
