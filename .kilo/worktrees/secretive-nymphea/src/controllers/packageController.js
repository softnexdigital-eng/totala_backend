import prisma from '../prisma/client.js'
import { sendSuccess, sendError } from '../utils/responseHandler.js'

/**
 * Calculate package final price
 */
const calculatePackagePrice = (transportCost, guidanceFee, doctorFee, testFee, discountPercent) => {
  const total = transportCost + guidanceFee + doctorFee + testFee
  const discount = total * ((discountPercent || 0) / 100)
  const finalPrice = parseFloat((total - discount).toFixed(2))
  return { totalPrice: parseFloat(total.toFixed(2)), finalPrice }
}

/**
 * Create a new package
 * POST /api/packages
 */
export const createPackage = async (req, res) => {
  try {
    const {
      name,
      description,
      transportCost,
      guidanceFee,
      doctorFee,
      testFee,
      discountPercent,
      isActive
    } = req.body

    if (!name) {
      return sendError(res, 'Package name is required', 'Name is required', 400)
    }

    const { totalPrice, finalPrice } = calculatePackagePrice(
      transportCost || 0,
      guidanceFee || 0,
      doctorFee || 0,
      testFee || 0,
      discountPercent || 0
    )

    const packageData = await prisma.package.create({
      data: {
        name,
        description: description || null,
        transportCost: transportCost || 0,
        guidanceFee: guidanceFee || 0,
        doctorFee: doctorFee || 0,
        testFee: testFee || 0,
        totalPrice,
        discountPercent: discountPercent || 0,
        finalPrice,
        isActive: isActive !== undefined ? isActive : true
      }
    })

    return sendSuccess(res, 'Package created successfully', packageData, 201)
  } catch (error) {
    return sendError(res, 'Failed to create package', error.message)
  }
}

/**
 * Get all packages
 * GET /api/packages
 */
export const getPackages = async (req, res) => {
  try {
    const packages = await prisma.package.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return sendSuccess(res, 'Packages fetched successfully', packages)
  } catch (error) {
    return sendError(res, 'Failed to fetch packages', error.message)
  }
}

/**
 * Get a single package by ID
 * GET /api/packages/:id
 */
export const getPackage = async (req, res) => {
  try {
    const { id } = req.params

    const packageData = await prisma.package.findUnique({
      where: { id }
    })

    if (!packageData) {
      return sendError(res, 'Package not found', 'Package not found', 404)
    }

    return sendSuccess(res, 'Package fetched successfully', packageData)
  } catch (error) {
    return sendError(res, 'Failed to fetch package', error.message)
  }
}

/**
 * Update a package
 * PUT /api/packages/:id
 */
export const updatePackage = async (req, res) => {
  try {
    const { id } = req.params
    const {
      name,
      description,
      transportCost,
      guidanceFee,
      doctorFee,
      testFee,
      discountPercent,
      isActive
    } = req.body

    const existingPackage = await prisma.package.findUnique({
      where: { id }
    })

    if (!existingPackage) {
      return sendError(res, 'Package not found', 'Package not found', 404)
    }

    const transport = transportCost !== undefined ? transportCost : existingPackage.transportCost
    const guidance = guidanceFee !== undefined ? guidanceFee : existingPackage.guidanceFee
    const doctor = doctorFee !== undefined ? doctorFee : existingPackage.doctorFee
    const test = testFee !== undefined ? testFee : existingPackage.testFee
    const discount = discountPercent !== undefined ? discountPercent : existingPackage.discountPercent

    const { totalPrice, finalPrice } = calculatePackagePrice(transport, guidance, doctor, test, discount)

    const updatedPackage = await prisma.package.update({
      where: { id },
      data: {
        name: name || existingPackage.name,
        description: description !== undefined ? description : existingPackage.description,
        transportCost: transport,
        guidanceFee: guidance,
        doctorFee: doctor,
        testFee: test,
        totalPrice,
        discountPercent: discount,
        finalPrice,
        isActive: isActive !== undefined ? isActive : existingPackage.isActive
      }
    })

    return sendSuccess(res, 'Package updated successfully', updatedPackage)
  } catch (error) {
    return sendError(res, 'Failed to update package', error.message)
  }
}

/**
 * Delete a package
 * DELETE /api/packages/:id
 */
export const deletePackage = async (req, res) => {
  try {
    const { id } = req.params

    const existingPackage = await prisma.package.findUnique({
      where: { id }
    })

    if (!existingPackage) {
      return sendError(res, 'Package not found', 'Package not found', 404)
    }

        await prisma.package.delete({
      where: { id }
    })

    return sendSuccess(res, 'Package deleted successfully')
  } catch (error) {
    return sendError(res, 'Failed to delete package', error.message)
  }
}
