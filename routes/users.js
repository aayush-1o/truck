const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Driver = require('../models/Driver');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId, handleValidationErrors } = require('../middleware/validator');

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin only)
router.get('/',
    protect,
    authorize('admin'),
    async (req, res) => {
        try {
            const filter = {};

            // Apply role filter if provided
            if (req.query.role) {
                filter.role = req.query.role;
            }

            const users = await User.find(filter)
                .select('-password')
                .sort({ createdAt: -1 })
                .limit(parseInt(req.query.limit) || 100);

            res.json({
                success: true,
                count: users.length,
                data: users
            });
        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch users',
                error: error.message
            });
        }
    }
);

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');

        // If user is a driver, get driver profile too
        let driverProfile = null;
        if (user.role === 'driver') {
            driverProfile = await Driver.findOne({ user: user._id });
        }

        res.json({
            success: true,
            data: {
                user,
                driverProfile
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile',
            error: error.message
        });
    }
});

// @route   PUT /api/users/profile
// @desc    Update current user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
    try {
        const allowedUpdates = ['name', 'phone'];
        const updates = {};

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updates,
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: user
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (soft delete - set isActive to false)
// @access  Private (Admin only)
router.delete('/:id',
    protect,
    authorize('admin'),
    validateObjectId('id'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const user = await User.findById(req.params.id);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Soft delete
            user.isActive = false;
            await user.save();

            res.json({
                success: true,
                message: 'User deactivated successfully'
            });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete user',
                error: error.message
            });
        }
    }
);

// @route   PATCH /api/users/:id/role
// @desc    Update user role
// @access  Private (Admin only)
router.patch('/:id/role',
    protect,
    authorize('admin'),
    validateObjectId('id'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { role } = req.body;

            if (!['admin', 'shipper', 'driver'].includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role specified'
                });
            }

            const user = await User.findByIdAndUpdate(
                req.params.id,
                { role },
                { new: true, runValidators: true }
            ).select('-password');

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.json({
                success: true,
                message: 'User role updated successfully',
                data: user
            });
        } catch (error) {
            console.error('Update role error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update user role',
                error: error.message
            });
        }
    }
);

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private (Admin only)
router.get('/stats',
    protect,
    authorize('admin'),
    async (req, res) => {
        try {
            const totalUsers = await User.countDocuments({ isActive: true });
            const shippers = await User.countDocuments({ role: 'shipper', isActive: true });
            const drivers = await User.countDocuments({ role: 'driver', isActive: true });
            const admins = await User.countDocuments({ role: 'admin', isActive: true });

            res.json({
                success: true,
                data: {
                    totalUsers,
                    shippers,
                    drivers,
                    admins
                }
            });
        } catch (error) {
            console.error('Get stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch statistics',
                error: error.message
            });
        }
    }
);

module.exports = router;
