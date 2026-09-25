import express from 'express'
import { uploadSingleFile, uploadMultipleFiles } from '../controllers/uploadController.js'
import { uploadSingle, uploadMultiple } from '../middlewares/upload.js'
import auth from '../middlewares/auth.js'

const router = express.Router()

/**
 * Upload Routes (Protected)
 * POST /api/upload/single - Upload a single file
 * POST /api/upload/multiple - Upload multiple files
 *
 * Query: ?type=prescriptions|receipts|reports
 */

router.use(auth)

router.post('/single', uploadSingle, uploadSingleFile)
router.post('/multiple', uploadMultiple, uploadMultipleFiles)

export default router
