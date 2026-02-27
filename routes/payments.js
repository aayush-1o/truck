const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Payment = require('../models/Payment');
const Shipment = require('../models/Shipment');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

// Initialize Razorpay instance
const getRazorpay = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret || keyId === 'rzp_test_YOUR_KEY_ID') {
        throw { status: 503, message: 'Payment gateway not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env' };
    }

    return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

// @route   POST /api/payments/order
// @desc    Create Razorpay payment order for a shipment
// @access  Private (Shipper)
router.post('/order', protect, authorize('shipper'), async (req, res) => {
    try {
        const { shipmentId } = req.body;

        if (!shipmentId) {
            return res.status(400).json({ success: false, message: 'Shipment ID is required' });
        }

        const shipment = await Shipment.findById(shipmentId);
        if (!shipment) {
            return res.status(404).json({ success: false, message: 'Shipment not found' });
        }

        // Verify this shipper owns this shipment
        if (shipment.shipper.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Check if already paid
        const existingPayment = await Payment.findOne({ shipment: shipmentId, status: 'paid' });
        if (existingPayment) {
            return res.status(400).json({ success: false, message: 'Shipment already paid' });
        }

        const totalPrice = shipment.pricing?.totalPrice || 0;
        if (totalPrice <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid shipment price' });
        }

        // Amount in paise (multiply by 100)
        const amountInPaise = Math.round(totalPrice * 100);

        const razorpay = getRazorpay();
        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `receipt_${shipmentId}`,
            notes: {
                shipmentId: shipmentId.toString(),
                shipperId: req.user._id.toString()
            }
        });

        // Save order to DB
        await Payment.findOneAndUpdate(
            { shipment: shipmentId },
            {
                shipment: shipmentId,
                shipper: req.user._id,
                razorpayOrderId: order.id,
                amount: amountInPaise,
                status: 'created'
            },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            data: {
                orderId: order.id,
                amount: amountInPaise,
                currency: 'INR',
                keyId: process.env.RAZORPAY_KEY_ID,
                shipmentId,
                description: `Payment for shipment ${shipment.trackingId}`
            }
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(error.status || 500).json({
            success: false,
            message: error.message || 'Failed to create payment order'
        });
    }
});

// @route   POST /api/payments/verify
// @desc    Verify payment signature after Razorpay checkout success
// @access  Private (Shipper)
router.post('/verify', protect, authorize('shipper'), async (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, shipmentId } = req.body;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({ success: false, message: 'Missing payment verification data' });
        }

        // Verify signature
        const body = razorpayOrderId + '|' + razorpayPaymentId;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpaySignature) {
            return res.status(400).json({ success: false, message: 'Payment verification failed - invalid signature' });
        }

        // Update payment record
        const payment = await Payment.findOneAndUpdate(
            { razorpayOrderId },
            {
                razorpayPaymentId,
                razorpaySignature,
                status: 'paid'
            },
            { new: true }
        );

        // Mark shipment as confirmed (payment received)
        if (shipmentId) {
            await Shipment.findByIdAndUpdate(shipmentId, { paymentStatus: 'paid' });

            // Notify shipper
            await Notification.notify(
                req.user._id,
                '✅ Payment Successful',
                `Your payment of ₹${Math.round(payment.amount / 100)} has been received.`,
                'success',
                shipmentId
            );
        }

        res.json({
            success: true,
            message: 'Payment verified successfully',
            data: payment
        });
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed',
            error: error.message
        });
    }
});

// @route   GET /api/payments/history
// @desc    Get payment history for current shipper
// @access  Private (Shipper)
router.get('/history', protect, authorize('shipper'), async (req, res) => {
    try {
        const payments = await Payment.find({ shipper: req.user._id })
            .populate('shipment', 'trackingId status pickupLocation deliveryLocation')
            .sort({ createdAt: -1 })
            .limit(50);

        const totalPaid = payments
            .filter(p => p.status === 'paid')
            .reduce((sum, p) => sum + (p.amount / 100), 0);

        res.json({
            success: true,
            data: payments,
            totalPaid: Math.round(totalPaid)
        });
    } catch (error) {
        console.error('Get payment history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment history',
            error: error.message
        });
    }
});

module.exports = router;
