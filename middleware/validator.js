const { body, param, query, validationResult } = require('express-validator');

// Middleware to handle validation errors
exports.handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// User registration validation
exports.validateRegister = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please enter a valid email')
        .normalizeEmail(),
    body('phone')
        .trim()
        .notEmpty().withMessage('Phone number is required')
        .matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit phone number'),
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role')
        .optional()
        .isIn(['admin', 'shipper', 'driver']).withMessage('Invalid role specified')
];

// User login validation
exports.validateLogin = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please enter a valid email')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required')
];

// Shipment creation validation
exports.validateShipment = [
    body('pickupLocation.address')
        .trim()
        .notEmpty().withMessage('Pickup address is required'),
    body('deliveryLocation.address')
        .trim()
        .notEmpty().withMessage('Delivery address is required'),
    body('cargo.weight')
        .notEmpty().withMessage('Cargo weight is required')
        .isFloat({ min: 1 }).withMessage('Weight must be at least 1 kg'),
    body('cargo.vehicleType')
        .notEmpty().withMessage('Vehicle type is required')
        .isIn(['Mini Truck (7ft)', 'Standard Truck (14ft)', 'Large Truck (19ft)', 'Container (20ft)', 'Refrigerated'])
        .withMessage('Invalid vehicle type'),
    body('pickupDate')
        .notEmpty().withMessage('Pickup date is required')
        .isISO8601().withMessage('Invalid date format')
];

// Shipment status update validation
exports.validateStatusUpdate = [
    body('status')
        .notEmpty().withMessage('Status is required')
        .isIn(['pending', 'assigned', 'picked-up', 'in-transit', 'delivered', 'cancelled'])
        .withMessage('Invalid status'),
    body('location').optional().isObject().withMessage('Location must be an object'),
    body('note').optional().trim()
];

// Driver profile validation
exports.validateDriver = [
    body('vehicleType')
        .notEmpty().withMessage('Vehicle type is required')
        .isIn(['Mini Truck (7ft)', 'Standard Truck (14ft)', 'Large Truck (19ft)', 'Container (20ft)', 'Refrigerated'])
        .withMessage('Invalid vehicle type'),
    body('vehicleNumber')
        .trim()
        .notEmpty().withMessage('Vehicle number is required'),
    body('licenseNumber')
        .trim()
        .notEmpty().withMessage('License number is required')
];

// Location update validation
exports.validateLocation = [
    body('lat')
        .notEmpty().withMessage('Latitude is required')
        .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('lng')
        .notEmpty().withMessage('Longitude is required')
        .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('address').optional().trim(),
    body('city').optional().trim()
];

// Payment validation
exports.validatePayment = [
    body('amount')
        .notEmpty().withMessage('Amount is required')
        .isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('shipmentId')
        .notEmpty().withMessage('Shipment ID is required')
        .isMongoId().withMessage('Invalid shipment ID')
];

// MongoDB ObjectId validation
exports.validateObjectId = (paramName = 'id') => [
    param(paramName)
        .notEmpty().withMessage(`${paramName} is required`)
        .isMongoId().withMessage(`Invalid ${paramName}`)
];
