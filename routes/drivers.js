const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');
const User = require('../models/User');
const Shipment = require('../models/Shipment');
const { protect, authorize } = require('../middleware/auth');
const { validateDriver, validateLocation, validateObjectId, handleValidationErrors } = require('../middleware/validator');

// @route   POST /api/drivers
// @desc    Create driver profile
// @access  Private (Driver or Admin)
router.post('/',
    protect,
    authorize('driver', 'admin'),
    validateDriver,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { vehicleType, vehicleNumber, licenseNumber } = req.body;

            // Check if driver profile already exists
            const existingDriver = await Driver.findOne({ user: req.user._id });
            if (existingDriver) {
                return res.status(400).json({
                    success: false,
                    message: 'Driver profile already exists'
                });
            }

            const driver = await Driver.create({
                user: req.user._id,
                vehicleType,
                vehicleNumber: vehicleNumber.toUpperCase(),
                licenseNumber: licenseNumber.toUpperCase()
            });

            await driver.populate('user', 'name email phone');

            res.status(201).json({
                success: true,
                message: 'Driver profile created successfully',
                data: driver
            });
        } catch (error) {
            console.error('Create driver error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create driver profile',
                error: error.message
            });
        }
    }
);

// @route   GET /api/drivers
// @desc    Get all drivers
// @access  Private (Admin or Shipper)
router.get('/',
    protect,
    authorize('admin', 'shipper'),
    async (req, res) => {
        try {
            const filter = {};

            // Filter by availability if specified
            if (req.query.available !== undefined) {
                filter.availability = req.query.available === 'true';
            }

            // Filter by vehicle type if specified
            if (req.query.vehicleType) {
                filter.vehicleType = req.query.vehicleType;
            }

            const drivers = await Driver.find(filter)
                .populate('user', 'name email phone')
                .sort({ 'rating.average': -1 })
                .limit(parseInt(req.query.limit) || 50);

            res.json({
                success: true,
                count: drivers.length,
                data: drivers
            });
        } catch (error) {
            console.error('Get drivers error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch drivers',
                error: error.message
            });
        }
    }
);

// @route   GET /api/drivers/profile
// @desc    Get current driver profile
// @access  Private (Driver)
router.get('/profile',
    protect,
    authorize('driver'),
    async (req, res) => {
        try {
            const driver = await Driver.findOne({ user: req.user._id })
                .populate('user', 'name email phone');

            if (!driver) {
                return res.status(404).json({
                    success: false,
                    message: 'Driver profile not found. Please create your profile first.'
                });
            }

            res.json({
                success: true,
                data: driver
            });
        } catch (error) {
            console.error('Get driver profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch driver profile',
                error: error.message
            });
        }
    }
);

// @route   PUT /api/drivers/location
// @desc    Update driver location
// @access  Private (Driver)
router.put('/location',
    protect,
    authorize('driver'),
    validateLocation,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { lat, lng, address, city } = req.body;

            const driver = await Driver.findOne({ user: req.user._id });

            if (!driver) {
                return res.status(404).json({
                    success: false,
                    message: 'Driver profile not found'
                });
            }

            driver.updateLocation(lat, lng, address, city);
            await driver.save();

            res.json({
                success: true,
                message: 'Location updated successfully',
                data: driver.currentLocation
            });
        } catch (error) {
            console.error('Update location error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update location',
                error: error.message
            });
        }
    }
);

// @route   PATCH /api/drivers/availability
// @desc    Toggle driver availability
// @access  Private (Driver)
router.patch('/availability',
    protect,
    authorize('driver'),
    async (req, res) => {
        try {
            const driver = await Driver.findOne({ user: req.user._id });

            if (!driver) {
                return res.status(404).json({
                    success: false,
                    message: 'Driver profile not found'
                });
            }

            driver.toggleAvailability();
            await driver.save();

            res.json({
                success: true,
                message: `Availability set to ${driver.availability ? 'available' : 'unavailable'}`,
                data: {
                    availability: driver.availability
                }
            });
        } catch (error) {
            console.error('Toggle availability error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle availability',
                error: error.message
            });
        }
    }
);

// @route   GET /api/drivers/earnings
// @desc    Get driver earnings and statistics
// @access  Private (Driver)
router.get('/earnings',
    protect,
    authorize('driver'),
    async (req, res) => {
        try {
            const driver = await Driver.findOne({ user: req.user._id });

            if (!driver) {
                return res.status(404).json({
                    success: false,
                    message: 'Driver profile not found'
                });
            }

            // Get recent shipments
            const recentShipments = await Shipment.find({ driver: req.user._id })
                .select('trackingId status pricing createdAt')
                .sort({ createdAt: -1 })
                .limit(10);

            res.json({
                success: true,
                data: {
                    statistics: driver.statistics,
                    rating: driver.rating,
                    recentShipments
                }
            });
        } catch (error) {
            console.error('Get earnings error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch earnings',
                error: error.message
            });
        }
    }
);

// @route   PUT /api/drivers/profile
// @desc    Update driver profile
// @access  Private (Driver)
router.put('/profile',
    protect,
    authorize('driver'),
    async (req, res) => {
        try {
            const allowedUpdates = ['vehicleType', 'vehicleNumber', 'licenseNumber'];
            const updates = {};

            allowedUpdates.forEach(field => {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                    if (field === 'vehicleNumber' || field === 'licenseNumber') {
                        updates[field] = req.body[field].toUpperCase();
                    }
                }
            });

            const driver = await Driver.findOneAndUpdate(
                { user: req.user._id },
                updates,
                { new: true, runValidators: true }
            ).populate('user', 'name email phone');

            if (!driver) {
                return res.status(404).json({
                    success: false,
                    message: 'Driver profile not found'
                });
            }

            res.json({
                success: true,
                message: 'Driver profile updated successfully',
                data: driver
            });
        } catch (error) {
            console.error('Update driver profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update driver profile',
                error: error.message
            });
        }
    }
);

module.exports = router;
