const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
    trackingId: {
        type: String,
        unique: true,
        required: true,
        uppercase: true
    },
    shipper: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Shipper is required']
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    pickupLocation: {
        address: {
            type: String,
            required: [true, 'Pickup address is required']
        },
        city: String,
        pincode: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    deliveryLocation: {
        address: {
            type: String,
            required: [true, 'Delivery address is required']
        },
        city: String,
        pincode: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    cargo: {
        weight: {
            type: Number,
            required: [true, 'Cargo weight is required'],
            min: [1, 'Weight must be at least 1 kg']
        },
        vehicleType: {
            type: String,
            required: [true, 'Vehicle type is required'],
            enum: ['Mini Truck (7ft)', 'Standard Truck (14ft)', 'Large Truck (19ft)', 'Container (20ft)', 'Refrigerated']
        },
        description: String,
        value: Number // For insurance purposes
    },
    status: {
        type: String,
        enum: ['pending', 'assigned', 'picked-up', 'in-transit', 'delivered', 'cancelled'],
        default: 'pending'
    },
    pricing: {
        basePrice: Number,
        insurance: Number,
        taxes: Number,
        totalPrice: {
            type: Number,
            required: true
        },
        distance: Number // in kilometers
    },
    payment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
        default: null
    },
    statusHistory: [{
        status: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        location: {
            lat: Number,
            lng: Number
        },
        note: String
    }],
    pickupDate: {
        type: Date,
        required: true
    },
    estimatedDeliveryDate: Date,
    actualDeliveryDate: Date,
    rating: {
        stars: {
            type: Number,
            min: 1,
            max: 5
        },
        review: String,
        ratedAt: Date
    },
    notes: String,
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

// Indexes for faster queries
shipmentSchema.index({ trackingId: 1 });
shipmentSchema.index({ shipper: 1 });
shipmentSchema.index({ driver: 1 });
shipmentSchema.index({ status: 1 });
shipmentSchema.index({ createdAt: -1 });

// Generate unique tracking ID before saving
shipmentSchema.pre('save', async function (next) {
    if (!this.trackingId) {
        // Generate tracking ID: SH + timestamp + random 4 digits
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(1000 + Math.random() * 9000);
        this.trackingId = `SH${timestamp}${random}`;
    }
    next();
});

// Method to update status with history
shipmentSchema.methods.updateStatus = function (newStatus, location = null, note = '') {
    this.status = newStatus;
    this.statusHistory.push({
        status: newStatus,
        timestamp: new Date(),
        location,
        note
    });

    // Update delivery date if delivered
    if (newStatus === 'delivered') {
        this.actualDeliveryDate = new Date();
    }
};

// Method to calculate pricing
shipmentSchema.statics.calculatePricing = function (distance, vehicleType, cargoValue = 0) {
    // Base rates per km for different vehicle types
    const rates = {
        'Mini Truck (7ft)': 8,
        'Standard Truck (14ft)': 10,
        'Large Truck (19ft)': 12,
        'Container (20ft)': 15,
        'Refrigerated': 18
    };

    const basePrice = distance * (rates[vehicleType] || 10);
    const insurance = Math.min(cargoValue * 0.01, 500); // 1% of cargo value, max 500
    const taxes = basePrice * 0.05; // 5% tax
    const totalPrice = basePrice + insurance + taxes;

    return {
        basePrice: Math.round(basePrice),
        insurance: Math.round(insurance),
        taxes: Math.round(taxes),
        totalPrice: Math.round(totalPrice),
        distance
    };
};

module.exports = mongoose.model('Shipment', shipmentSchema);
