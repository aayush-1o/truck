const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['info', 'success', 'warning', 'error'],
        default: 'info'
    },
    // Optional: link to a related shipment
    shipment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shipment',
        default: null
    },
    read: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ createdAt: -1 });

// Static helper to create a notification
notificationSchema.statics.notify = async function (userId, title, message, type = 'info', shipmentId = null) {
    return await this.create({
        user: userId,
        title,
        message,
        type,
        shipment: shipmentId
    });
};

module.exports = mongoose.model('Notification', notificationSchema);
