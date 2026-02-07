const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    shipment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shipment',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: [true, 'Payment amount is required'],
        min: [0, 'Amount cannot be negative']
    },
    currency: {
        type: String,
        default: 'INR',
        uppercase: true
    },
    paymentMethod: {
        type: String,
        enum: ['razorpay', 'stripe', 'cash', 'upi', 'card', 'netbanking'],
        default: 'razorpay'
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    transactionId: {
        type: String,
        unique: true,
        sparse: true // Allows multiple null values
    },
    invoiceUrl: String,
    invoiceNumber: {
        type: String,
        unique: true,
        sparse: true
    },
    breakdown: {
        basePrice: Number,
        insurance: Number,
        taxes: Number,
        discount: {
            type: Number,
            default: 0
        },
        promoCode: String
    },
    refund: {
        amount: Number,
        reason: String,
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed']
        },
        refundId: String,
        refundedAt: Date
    },
    paymentDate: Date,
    failureReason: String,
    metadata: {
        ipAddress: String,
        userAgent: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes
paymentSchema.index({ shipment: 1 });
paymentSchema.index({ user: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ createdAt: -1 });

// Generate invoice number before saving
paymentSchema.pre('save', async function (next) {
    if (!this.invoiceNumber && this.status === 'completed') {
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(100 + Math.random() * 900);
        this.invoiceNumber = `INV${timestamp}${random}`;
    }

    // Set payment date if status is completed
    if (this.status === 'completed' && !this.paymentDate) {
        this.paymentDate = new Date();
    }

    next();
});

// Method to mark payment as completed
paymentSchema.methods.markAsCompleted = function (transactionId, paymentDetails = {}) {
    this.status = 'completed';
    this.transactionId = transactionId;
    this.paymentDate = new Date();

    if (paymentDetails.razorpayPaymentId) {
        this.razorpayPaymentId = paymentDetails.razorpayPaymentId;
    }
    if (paymentDetails.razorpaySignature) {
        this.razorpaySignature = paymentDetails.razorpaySignature;
    }
};

// Method to mark payment as failed
paymentSchema.methods.markAsFailed = function (reason) {
    this.status = 'failed';
    this.failureReason = reason;
};

// Method to process refund
paymentSchema.methods.processRefund = function (amount, reason) {
    this.refund = {
        amount: amount || this.amount,
        reason,
        status: 'pending',
        refundedAt: new Date()
    };
    this.status = 'refunded';
};

// Static method to get payment statistics
paymentSchema.statics.getStatistics = async function (userId = null, startDate = null, endDate = null) {
    const match = { status: 'completed' };

    if (userId) {
        match.user = userId;
    }

    if (startDate || endDate) {
        match.paymentDate = {};
        if (startDate) match.paymentDate.$gte = startDate;
        if (endDate) match.paymentDate.$lte = endDate;
    }

    const stats = await this.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                totalAmount: { $sum: '$amount' },
                totalPayments: { $sum: 1 },
                averageAmount: { $avg: '$amount' }
            }
        }
    ]);

    return stats[0] || { totalAmount: 0, totalPayments: 0, averageAmount: 0 };
};

module.exports = mongoose.model('Payment', paymentSchema);
