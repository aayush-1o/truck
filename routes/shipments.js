const express = require('express');
const router = express.Router();
const Shipment = require('../models/Shipment');
const Driver = require('../models/Driver');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId, handleValidationErrors } = require('../middleware/validator');

// ===============================================================
// IMPORTANT: /track/:trackingId MUST come BEFORE /:id
// Otherwise Express treats "track" as a MongoDB ObjectId
// ===============================================================

// @route   GET /api/shipments/track/:trackingId
// @desc    Public shipment tracking
// @access  Public
router.get('/track/:trackingId', async (req, res) => {
    try {
        const shipment = await Shipment.findOne({
            trackingId: req.params.trackingId.toUpperCase()
        })
            .select('trackingId status statusHistory pickupLocation deliveryLocation estimatedDeliveryDate actualDeliveryDate cargo pricing')
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

// @route   POST /api/shipments
// @desc    Create new shipment
// @access  Private (Shipper only)
router.post('/', protect, authorize('shipper'), async (req, res) => {
    try {
        const { pickupLocation, deliveryLocation, cargo, pickupDate, notes, weight, vehicleType, cargoDescription, price } = req.body;

        // Support both nested object format and flat format from the frontend form
        const normalizedPickup = typeof pickupLocation === 'string'
            ? { address: pickupLocation }
            : pickupLocation;

        const normalizedDelivery = typeof deliveryLocation === 'string'
            ? { address: deliveryLocation }
            : deliveryLocation;

        // Support both nested cargo and flat fields
        const normalizedCargo = cargo || {
            weight: parseFloat(weight) || 0,
            vehicleType: vehicleType || 'Standard Truck (14ft)',
            description: cargoDescription || ''
        };

        if (!normalizedPickup?.address || !normalizedDelivery?.address) {
            return res.status(400).json({
                success: false,
                message: 'Pickup and delivery addresses are required'
            });
        }

        if (!normalizedCargo.weight || !normalizedCargo.vehicleType) {
            return res.status(400).json({
                success: false,
                message: 'Cargo weight and vehicle type are required'
            });
        }

        // Calculate pricing
        const estimatedDistance = 100; // km — placeholder (Phase 3: real geocoding)
        const pricing = Shipment.calculatePricing(
            estimatedDistance,
            normalizedCargo.vehicleType,
            normalizedCargo.value || 0
        );

        // If price was manually specified, use it
        if (price) {
            pricing.totalPrice = parseFloat(price);
        }

        // Create shipment
        const shipment = await Shipment.create({
            shipper: req.user._id,
            pickupLocation: normalizedPickup,
            deliveryLocation: normalizedDelivery,
            cargo: normalizedCargo,
            pickupDate: pickupDate || new Date(),
            pricing,
            notes
        });

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
});

// @route   GET /api/shipments
// @desc    Get all shipments (filtered by role)
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        let filter = {};

        if (req.user.role === 'shipper') {
            filter.shipper = req.user._id;
        } else if (req.user.role === 'driver') {
            const driver = await Driver.findOne({ user: req.user._id });
            if (driver) {
                filter.driver = driver._id;
            }
        }
        // Admin sees all

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

            const isShipper = shipment.shipper._id.toString() === req.user._id.toString();
            const driver = await Driver.findOne({ user: req.user._id });
            const isDriver = driver && shipment.driver &&
                shipment.driver._id.toString() === driver._id.toString();
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
    handleValidationErrors,
    async (req, res) => {
        try {
            const { status, location, note } = req.body;

            const validStatuses = ['pending', 'assigned', 'picked-up', 'in-transit', 'delivered', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
                });
            }

            const shipment = await Shipment.findById(req.params.id);

            if (!shipment) {
                return res.status(404).json({
                    success: false,
                    message: 'Shipment not found'
                });
            }

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

            if (req.user.role !== 'admin' && shipment.shipper.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this shipment'
                });
            }

            // Allow status updates from driver-dashboard.js which calls PUT (not PATCH)
            const allowedUpdates = ['pickupLocation', 'deliveryLocation', 'cargo', 'pickupDate', 'notes', 'status'];
            const updates = {};

            allowedUpdates.forEach(field => {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                }
            });

            // If only updating status, allow even if not pending
            if (Object.keys(updates).length === 1 && updates.status) {
                // Status-only update, always allowed for authorized user
            } else if (shipment.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: 'Can only edit details of pending shipments'
                });
            }

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

            if (req.user.role !== 'admin' && shipment.shipper.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to cancel this shipment'
                });
            }

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


// @route   PATCH /api/shipments/:id/assign
// @desc    Admin assigns a driver to a shipment
// @access  Private (Admin only)
router.patch('/:id/assign',
    protect,
    authorize('admin'),
    validateObjectId('id'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { driverId } = req.body;

            if (!driverId) {
                return res.status(400).json({ success: false, message: 'Driver ID is required' });
            }

            const Driver = require('../models/Driver');
            const User = require('../models/User');
            const Notification = require('../models/Notification');

            const shipment = await Shipment.findById(req.params.id);
            if (!shipment) {
                return res.status(404).json({ success: false, message: 'Shipment not found' });
            }

            const driver = await Driver.findById(driverId).populate('user', 'name email');
            if (!driver) {
                return res.status(404).json({ success: false, message: 'Driver not found' });
            }

            // Assign driver and update status
            shipment.driver = driverId;
            shipment.status = 'assigned';
            shipment.statusHistory = shipment.statusHistory || [];
            shipment.statusHistory.push({
                status: 'assigned',
                timestamp: new Date(),
                note: `Assigned to driver: ${driver.user?.name || 'Unknown'}`
            });
            await shipment.save();

            // Notify the driver user
            if (driver.user) {
                await Notification.notify(
                    driver.user._id || driver.user,
                    '🚛 New Shipment Assigned',
                    `You have been assigned to shipment ${shipment.trackingId}. Check your dashboard.`,
                    'info',
                    shipment._id
                );
            }

            // Notify the shipper
            if (shipment.shipper) {
                await Notification.notify(
                    shipment.shipper,
                    '✅ Driver Assigned',
                    `A driver has been assigned to your shipment ${shipment.trackingId}.`,
                    'success',
                    shipment._id
                );
            }

            const updated = await Shipment.findById(req.params.id)
                .populate('shipper', 'name email')
                .populate({ path: 'driver', populate: { path: 'user', select: 'name email' } });

            res.json({
                success: true,
                message: 'Driver assigned successfully',
                data: updated
            });
        } catch (error) {
            console.error('Assign driver error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to assign driver',
                error: error.message
            });
        }
    }
);

module.exports = router;
