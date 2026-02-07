const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    vehicleType: {
        type: String,
        required: [true, 'Vehicle type is required'],
        enum: ['Mini Truck (7ft)', 'Standard Truck (14ft)', 'Large Truck (19ft)', 'Container (20ft)', 'Refrigerated']
    },
    vehicleNumber: {
        type: String,
        required: [true, 'Vehicle number is required'],
        uppercase: true,
        trim: true
    },
    licenseNumber: {
        type: String,
        required: [true, 'License number is required'],
        uppercase: true,
        trim: true
    },
    currentLocation: {
        address: String,
        city: String,
        coordinates: {
            lat: {
                type: Number,
                min: -90,
                max: 90
            },
            lng: {
                type: Number,
                min: -180,
                max: 180
            }
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    },
    availability: {
        type: Boolean,
        default: true
    },
    rating: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        count: {
            type: Number,
            default: 0
        }
    },
    statistics: {
        totalDeliveries: {
            type: Number,
            default: 0
        },
        completedDeliveries: {
            type: Number,
            default: 0
        },
        cancelledDeliveries: {
            type: Number,
            default: 0
        },
        totalEarnings: {
            type: Number,
            default: 0
        }
    },
    documents: {
        licenseVerified: {
            type: Boolean,
            default: false
        },
        vehicleVerified: {
            type: Boolean,
            default: false
        },
        backgroundCheckCompleted: {
            type: Boolean,
            default: false
        }
    },
    bankDetails: {
        accountNumber: String,
        ifscCode: String,
        accountHolderName: String
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
driverSchema.index({ user: 1 });
driverSchema.index({ availability: 1 });
driverSchema.index({ 'rating.average': -1 });

// Method to update location
driverSchema.methods.updateLocation = function (lat, lng, address = '', city = '') {
    this.currentLocation = {
        coordinates: { lat, lng },
        address,
        city,
        lastUpdated: new Date()
    };
};

// Method to update rating
driverSchema.methods.updateRating = function (newRating) {
    const totalRating = (this.rating.average * this.rating.count) + newRating;
    this.rating.count += 1;
    this.rating.average = totalRating / this.rating.count;
};

// Method to toggle availability
driverSchema.methods.toggleAvailability = function () {
    this.availability = !this.availability;
};

// Static method to find nearby drivers
driverSchema.statics.findNearby = async function (lat, lng, maxDistance = 50, vehicleType = null) {
    // This is a simplified version. In production, use MongoDB geospatial queries
    const query = { availability: true };
    if (vehicleType) {
        query.vehicleType = vehicleType;
    }

    return this.find(query)
        .populate('user', 'name phone email')
        .sort({ 'rating.average': -1 })
        .limit(10);
};

module.exports = mongoose.model('Driver', driverSchema);
