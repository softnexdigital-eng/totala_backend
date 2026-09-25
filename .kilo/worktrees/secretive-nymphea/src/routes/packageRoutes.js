import express from 'express'
import {
  createPackage,
  getPackages,
  getPackage,
  updatePackage,
  deletePackage
} from '../controllers/packageController.js'
import { validate, packageSchemas } from '../middlewares/validation.js'
import auth from '../middlewares/auth.js'

const router = express.Router()

/**
 * Package Routes (Protected)
 * GET /api/packages - Get all packages
 * POST /api/packages - Create a new package
 * GET /api/packages/:id - Get a single package
 * PUT /api/packages/:id - Update a package
 * DELETE /api/packages/:id - Delete a package
 */

router.use(auth)

router.route('/')
  .get(getPackages)
  .post(validate(packageSchemas.create), createPackage)

router.route('/:id')
  .get(getPackage)
  .put(validate(packageSchemas.update), updatePackage)
  .delete(deletePackage)

export default router
