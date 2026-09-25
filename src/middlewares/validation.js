import Joi from 'joi'

/**
 * Validation middleware factory
 * Usage: validate(schema) where schema is a Joi object with body, params, query
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const dataToValidate = {}
    if (schema.body) dataToValidate.body = req.body
    if (schema.params) dataToValidate.params = req.params
    if (schema.query) dataToValidate.query = req.query

    const { error } = schema.validate(
      dataToValidate,
      { abortEarly: false, allowUnknown: true }
    )

    if (error) {
      const messages = error.details.map((detail) => detail.message)
      return res.status(400).json({
        success: false,
        message: 'ভ্যালিডেশন ত্রুটি',
        data: null,
        error: messages
      })
    }

    next()
  }
}

/**
 * Joi validation schemas for each endpoint
 */

// Auth schemas
export const authSchemas = {
  register: Joi.object({
    body: Joi.object({
      name: Joi.string().min(2).max(100).required().messages({
        'string.empty': 'নাম প্রয়োজন',
        'string.min': 'নাম কমপক্ষে ২ অক্ষর হতে হবে',
        'any.required': 'নাম প্রয়োজন'
      }),
      email: Joi.string().email().required().messages({
        'string.email': 'বৈধ ইমেল প্রয়োজন',
        'any.required': 'ইমেল প্রয়োজন'
      }),
      password: Joi.string().min(6).required().messages({
        'string.min': 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে',
        'any.required': 'পাসওয়ার্ড প্রয়োজন'
      }),
      whatsappNumber: Joi.string().optional().allow('')
    })
  }),

  login: Joi.object({
    body: Joi.object({
      email: Joi.string().email().required().messages({
        'string.email': 'বৈধ ইমেল প্রয়োজন',
        'any.required': 'ইমেল প্রয়োজন'
      }),
      password: Joi.string().required().messages({
        'any.required': 'পাসওয়ার্ড প্রয়োজন'
      })
    })
  }),

  verifyOtp: Joi.object({
    body: Joi.object({
      email: Joi.string().email().required().messages({
        'string.email': 'বৈধ ইমেল প্রয়োজন',
        'any.required': 'ইমেল প্রয়োজন'
      }),
      otp: Joi.string().length(6).required().messages({
        'string.length': 'OTP ৬ অংকের হতে হবে',
        'any.required': 'OTP প্রয়োজন'
      })
    })
  })
}

// Patient schemas
export const patientSchemas = {
  create: Joi.object({
    body: Joi.object({
      name: Joi.string().min(2).max(100).required(),
      phone: Joi.string().required(),
      age: Joi.number().integer().min(0).max(150).optional(),
      address: Joi.string().optional().allow(''),
      password: Joi.string().min(6).optional().allow(''),
      isRegistered: Joi.boolean().optional()
    })
  }),

  update: Joi.object({
    params: Joi.object({
      id: Joi.string().required()
    }),
    body: Joi.object({
      name: Joi.string().min(2).max(100).optional(),
      phone: Joi.string().optional(),
      age: Joi.number().integer().min(0).max(150).optional(),
      address: Joi.string().optional().allow(''),
      password: Joi.string().min(6).optional().allow(''),
      isRegistered: Joi.boolean().optional()
    })
  })
}

// Doctor schemas
export const doctorSchemas = {
  create: Joi.object({
    body: Joi.object({
      name: Joi.string().min(2).max(100).required(),
      profileUrl: Joi.string().uri().optional().allow(''),
      imageUrl: Joi.string().uri().optional().allow(''),
      designation: Joi.string().optional().allow(''),
      specialty: Joi.string().optional().allow(''),
      qualifications: Joi.string().optional().allow(''),
      hospital: Joi.string().optional().allow(''),
      department: Joi.string().optional().allow(''),
      unit: Joi.string().optional().allow(''),
      room: Joi.string().optional().allow(''),
      consultationFee: Joi.number().min(0).optional(),
      visitingDays: Joi.string().optional().allow(''),
      visitingTime: Joi.string().optional().allow(''),
      appointmentUrl: Joi.string().uri().optional().allow(''),
      isActive: Joi.boolean().optional()
    })
  }),

  update: Joi.object({
    params: Joi.object({
      id: Joi.string().required()
    }),
    body: Joi.object({
      name: Joi.string().min(2).max(100).optional(),
      profileUrl: Joi.string().uri().optional().allow(''),
      imageUrl: Joi.string().uri().optional().allow(''),
      designation: Joi.string().optional().allow(''),
      specialty: Joi.string().optional().allow(''),
      qualifications: Joi.string().optional().allow(''),
      hospital: Joi.string().optional().allow(''),
      department: Joi.string().optional().allow(''),
      unit: Joi.string().optional().allow(''),
      room: Joi.string().optional().allow(''),
      consultationFee: Joi.number().min(0).optional(),
      visitingDays: Joi.string().optional().allow(''),
      visitingTime: Joi.string().optional().allow(''),
      appointmentUrl: Joi.string().uri().optional().allow(''),
      isActive: Joi.boolean().optional()
    })
  })
}

// Agent schemas
export const agentSchemas = {
  login: Joi.object({
    body: Joi.object({
      email: Joi.string().email().required().messages({
        'string.email': 'বৈধ ইমেল প্রয়োজন',
        'any.required': 'ইমেল প্রয়োজন'
      }),
      password: Joi.string().required().messages({
        'any.required': 'পাসওয়ার্ড প্রয়োজন'
      })
    })
  }),

  create: Joi.object({
    body: Joi.object({
      name: Joi.string().min(2).max(100).required(),
      phone: Joi.string().required(),
      email: Joi.string().email().optional().allow(''),
      isActive: Joi.boolean().optional()
    })
  }),

  update: Joi.object({
    params: Joi.object({
      id: Joi.string().required()
    }),
    body: Joi.object({
      name: Joi.string().min(2).max(100).optional(),
      phone: Joi.string().optional(),
      email: Joi.string().email().optional().allow(''),
      isActive: Joi.boolean().optional()
    })
  })
}

// Appointment schemas
export const appointmentSchemas = {
  create: Joi.object({
    body: Joi.object({
      patientId: Joi.string().optional().allow(null),
      doctorId: Joi.string().required(),
      agentId: Joi.string().optional().allow(null),
      hospital: Joi.string().optional().allow(''),
      date: Joi.date().iso().required(),
      status: Joi.string().valid('pending', 'confirmed', 'received', 'ongoing', 'completed', 'cancelled').optional(),
      serviceType: Joi.string().valid('online', 'package').required(),
      serviceFee: Joi.number().optional(),
      packageId: Joi.string().optional().allow(null),
      packagePrice: Joi.number().min(0).optional(),
      packageDiscount: Joi.number().min(0).max(100).optional(),
      discountPercent: Joi.number().min(0).max(100).optional(),
      notes: Joi.string().optional().allow(''),
      whatsappNumber: Joi.string().optional().allow('')
    })
  }),

  update: Joi.object({
    params: Joi.object({
      id: Joi.string().required()
    }),
    body: Joi.object({
      patientId: Joi.string().optional().allow(null),
      doctorId: Joi.string().optional(),
      agentId: Joi.string().optional().allow(null),
      hospital: Joi.string().optional().allow(''),
      date: Joi.date().iso().optional(),
      status: Joi.string().valid('pending', 'confirmed', 'received', 'ongoing', 'completed', 'cancelled').optional(),
      serviceType: Joi.string().valid('online', 'package').optional(),
      serviceFee: Joi.number().optional(),
      packageId: Joi.string().optional().allow(null),
      packagePrice: Joi.number().min(0).optional(),
      packageDiscount: Joi.number().min(0).max(100).optional(),
      discountPercent: Joi.number().min(0).max(100).optional(),
      notes: Joi.string().optional().allow(''),
      whatsappNumber: Joi.string().optional().allow('')
    })
  }),

  status: Joi.object({
    params: Joi.object({
      id: Joi.string().required()
    }),
    body: Joi.object({
      status: Joi.string().valid('pending', 'confirmed', 'received', 'ongoing', 'completed', 'cancelled').required(),
      discountPercent: Joi.number().min(0).max(100).optional().allow(null)
    })
  })
}

// Test schemas
export const testSchemas = {
  create: Joi.object({
    body: Joi.object({
      appointmentId: Joi.string().required(),
      testName: Joi.string().required(),
      actualCost: Joi.number().min(0).required(),
      discountPercent: Joi.number().min(0).max(100).optional(),
      finalCost: Joi.number().min(0).optional(),
      reportUrl: Joi.string().uri().optional().allow(''),
      prescriptionUrl: Joi.string().uri().optional().allow(''),
      receiptUrl: Joi.string().uri().optional().allow(''),
      status: Joi.string().valid('pending', 'done').optional()
    })
  }),

  update: Joi.object({
    params: Joi.object({
      id: Joi.string().required()
    }),
    body: Joi.object({
      testName: Joi.string().optional(),
      actualCost: Joi.number().min(0).optional(),
      discountPercent: Joi.number().min(0).max(100).optional(),
      finalCost: Joi.number().min(0).optional(),
      reportUrl: Joi.string().uri().optional().allow(''),
      prescriptionUrl: Joi.string().uri().optional().allow(''),
      receiptUrl: Joi.string().uri().optional().allow(''),
      status: Joi.string().valid('pending', 'done').optional(),
      uploadedAt: Joi.date().iso().optional().allow(null)
    })
  })
}

// Package schemas
export const packageSchemas = {
  create: Joi.object({
    body: Joi.object({
      name: Joi.string().min(2).max(100).required(),
      description: Joi.string().optional().allow(''),
      transportCost: Joi.number().min(0).optional(),
      guidanceFee: Joi.number().min(0).optional(),
      doctorFee: Joi.number().min(0).optional(),
      testFee: Joi.number().min(0).optional(),
      discountPercent: Joi.number().min(0).max(100).optional(),
      isActive: Joi.boolean().optional()
    })
  }),

  update: Joi.object({
    params: Joi.object({
      id: Joi.string().required()
    }),
    body: Joi.object({
      name: Joi.string().min(2).max(100).optional(),
      description: Joi.string().optional().allow(''),
      transportCost: Joi.number().min(0).optional(),
      guidanceFee: Joi.number().min(0).optional(),
      doctorFee: Joi.number().min(0).optional(),
      testFee: Joi.number().min(0).optional(),
      discountPercent: Joi.number().min(0).max(100).optional(),
      isActive: Joi.boolean().optional()
    })
  })
}
