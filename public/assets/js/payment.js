/**
 * payment.js - Razorpay payment handler
 * Loaded in shipper-dashboard pages
 */

/**
 * Initiate Razorpay checkout for a shipment
 * @param {string} shipmentId - MongoDB shipment ID
 * @param {string} trackingId - Human readable tracking ID
 * @param {number} amount - Total price in INR
 */
async function initiatePayment(shipmentId, trackingId, amount) {
    try {
        // Create order on backend
        const orderRes = await window.API.payments.createOrder(shipmentId);
        if (!orderRes.success) throw new Error(orderRes.message);

        const { orderId, keyId, currency, description } = orderRes.data;

        // Razorpay options
        const options = {
            key: keyId,
            amount: Math.round(amount * 100), // paise
            currency: currency || 'INR',
            name: 'FreightFlow',
            description: description || `Payment for ${trackingId}`,
            order_id: orderId,
            handler: async function (response) {
                // Verify on backend
                try {
                    const verifyRes = await window.API.payments.verify({
                        razorpayOrderId: response.razorpay_order_id,
                        razorpayPaymentId: response.razorpay_payment_id,
                        razorpaySignature: response.razorpay_signature,
                        shipmentId
                    });

                    if (verifyRes.success) {
                        window.API.ui.showSuccess(`✅ Payment of ₹${amount.toLocaleString('en-IN')} successful!`);
                        // Refresh page after 2s to show updated status
                        setTimeout(() => window.location.reload(), 2000);
                    } else {
                        throw new Error('Payment verification failed');
                    }
                } catch (err) {
                    window.API.ui.showError('Payment verification failed. Please contact support.');
                    console.error('Payment verify error:', err);
                }
            },
            prefill: {
                name: window.API.auth.getCurrentUser()?.name || '',
                email: window.API.auth.getCurrentUser()?.email || ''
            },
            theme: {
                color: '#2563eb'
            },
            modal: {
                ondismiss: function () {
                    window.API.ui.showNotification('Payment cancelled', 'warning', 3000);
                }
            }
        };

        // Load Razorpay script if not already loaded
        await loadRazorpayScript();

        const rzp = new window.Razorpay(options);
        rzp.open();

    } catch (error) {
        console.error('Payment initiation error:', error);
        if (error.message && error.message.includes('not configured')) {
            window.API.ui.showError('⚙️ Payment gateway not configured yet. Ask admin to add Razorpay keys.');
        } else {
            window.API.ui.showError(error.message || 'Failed to initiate payment');
        }
    }
}

function loadRazorpayScript() {
    return new Promise((resolve, reject) => {
        if (window.Razorpay) return resolve();
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load Razorpay'));
        document.head.appendChild(script);
    });
}

// Make globally available
window.initiatePayment = initiatePayment;
