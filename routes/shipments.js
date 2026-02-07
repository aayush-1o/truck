const express = require('express');
const router = express.Router();
const Shipment = require('../models/Shipment');
const Driver = require('../models/Driver');
const { protect, authorize } = require('../middleware/auth');
const { validateShipment, validateStatusUpdate, validateObjectId, handleValidationErrors } = require('../middleware/validator');

// @route   POST /api/shipments
// @desc    Create new shipment
// @access  Private (Shipper only)
router.post('/',
    protect,
    authorize('shipper'),
    validateShipment,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { pickupLocation, deliveryLocation, cargo, pickupDate, notes } = req.body;

            // Calculate pricing (simplified - in production, use actual distance calculation)
            const estimatedDistance = 100; // km - replace with actual calculation
            const pricing = Shipment.calculatePricing(
                estimatedDistance,
                cargo.vehicleType,
                cargo.value || 0
            );

            // Create shipment
            const shipment = await Shipment.create({
                shipper: req.user._id,
                pickupLocation,
                deliveryLocation,
                cargo,
                pickupDate,
                pricing,
                notes
            });

            // Populate shipper details
            await shipment.populate('shipper', 'name email phone');

            res.status(201).json({
                success: true,
                message: 'Shipment created successfully',
                data: shipment
            });
        } catch (error) {
            console.error('Create shipment error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create shipment',
                error: error.message
            });
        }
    }
);

// @route   GET /api/shipments
// @desc    Get all shipments (filtered by role)
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        let filter = {};

        // Filter based on user role
        if (req.user.role === 'shipper') {
            filter.shipper = req.user._id;
        } else if (req.user.role === 'driver') {
            // Find driver profile
            const driver = await Driver.findOne({ user: req.user._id });
            if (driver) {
                filter.driver = driver._id;
            }
        }
        // Admin can see all shipments

        // Apply status filter if provided
        if (req.query.status) {
            filter.status = req.query.status;
        }

        const shipments = await Shipment.find(filter)
            .populate('shipper', 'name email phone')
            .populate('driver', 'name email phone')
            .sort({ createdAt: -1 })
            .limit(parseInt(req.query.limit) || 100);

        res.json({
            success: true,
            count: shipments.length,
            data: shipments
        });
    } catch (error) {
        console.error('Get shipments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch shipments',
            error: error.message
        });
    }
});

// @route   GET /api/shipments/:id
// @desc    Get single shipment
// @access  Private
router.get('/:id',
    protect,
    validateObjectId('id'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const shipment = await Shipment.findById(req.params.id)
                .populate('shipper', 'name email phone')
                .populate('driver', 'name email phone')
                .populate('payment');

            if (!shipment) {
                return res.status(404).json({
                    success: false,
                    message: 'Shipment not found'
                });
            }

            // Check authorization
            const isShipper = shipment.shipper._id.toString() === req.user._id.toString();
            const driver = await Driver.findOne({ user: req.user._id });
            const isDriver = driver && shipment.driver && shipment.driver._id.toString() === driver._id.toString();
            const isAdmin = req.user.role === 'admin';

            if (!isShipper && !isDriver && !isAdmin) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to view this shipment'
                });
            }

            res.json({
                success: true,
                data: shipment
            });
        } catch (error) {
            console.error('Get shipment error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch shipment',
                error: error.message
            });
        }
    }
);

// @route   PATCH /api/shipments/:id/status
// @desc    Update shipment status
// @access  Private (Driver or Admin)
router.patch('/:id/status',
    protect,
    authorize('driver', 'admin'),
    validateObjectId('id'),
    validateStatusUpdate,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { status, location, note } = req.body;

            const shipment = await Shipment.findById(req.params.id);

            if (!shipment) {
                return res.status(404).json({
                    success: false,
                    message: 'Shipment not found'
                });
            }

            // Update status with history
            shipment.updateStatus(status, location, note || '');
            await shipment.save();

            res.json({
                success: true,
                message: 'Shipment status updated successfully',
                data: shipment
            });
        } catch (error) {
            console.error('Update status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update shipment status',
                error: error.message
            });
        }
    }
);

// @route   PUT /api/shipments/:id
// @desc    Update shipment details
// @access  Private (Shipper or Admin)
router.put('/:id',
    protect,
    authorize('shipper', 'admin'),
    validateObjectId('id'),
    handleValidationErrors,
    async (req, res) => {
        try {
            let shipment = await Shipment.findById(req.params.id);

            if (!shipment) {
                return res.status(404).json({
                    success: false,
                    message: 'Shipment not found'
                });
            }

            // Check if user is the shipper or admin
            if (req.user.role !== 'admin' && shipment.shipper.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this shipment'
                });
            }

            // Only allow updates if shipment is pending
            if (shipment.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: 'Can only update pending shipments'
                });
            }

            // Update shipment
            const allowedUpdates = ['pickupLocation', 'deliveryLocation', 'cargo', 'pickupDate', 'notes'];
            const updates = {};

            allowedUpdates.forEach(field => {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                }
            });

            shipment = await Shipment.findByIdAndUpdate(
                req.params.id,
                updates,
                { new: true, runValidators: true }
            );

            res.json({
                success: true,
                message: 'Shipment updated successfully',
                data: shipment
            });
        } catch (error) {
            console.error('Update shipment error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update shipment',
                error: error.message
            });
        }
    }
);

// @route   DELETE /api/shipments/:id
// @desc    Cancel/delete shipment
// @access  Private (Shipper or Admin)
router.delete('/:id',
    protect,
    authorize('shipper', 'admin'),
    validateObjectId('id'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const shipment = await Shipment.findById(req.params.id);

            if (!shipment) {
                return res.status(404).json({
                    success: false,
                    message: 'Shipment not found'
                });
            }

            // Check authorization
            if (req.user.role !== 'admin' && shipment.shipper.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to cancel this shipment'
                });
            }

            // Can only cancel if not delivered
            if (shipment.status === 'delivered') {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot cancel a delivered shipment'
                });
            }

            shipment.status = 'cancelled';
            await shipment.save();

            res.json({
                success: true,
                message: 'Shipment cancelled successfully',
                data: shipment
            });
        } catch (error) {
            console.error('Delete shipment error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to cancel shipment',
                error: error.message
            });
        }
    }
);

// @route   GET /api/shipments/track/:trackingId
// @desc    Public shipment tracking
// @access  Public
router.get('/track/:trackingId', async (req, res) => {
    try {
        const shipment = await Shipment.findOne({ trackingId: req.params.trackingId.toUpperCase() })
            .select('trackingId status statusHistory pickupLocation deliveryLocation estimatedDeliveryDate actualDeliveryDate')
            .lean();

        if (!shipment) {
            return res.status(404).json({
                success: false,
                message: 'Shipment not found with this tracking ID'
            });
        }

        res.json({
            success: true,
            data: shipment
        });
    } catch (error) {
        console.error('Track shipment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to track shipment',
            error: error.message
        });
    }
});

module.exports = router;
