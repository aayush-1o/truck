/**
 * utils/email.js - Nodemailer email helper
 * Gracefully skips if EMAIL_USER/EMAIL_PASS not configured
 */

const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS ||
        process.env.EMAIL_USER === 'your-email@gmail.com') {
        return null;
    }
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
    return transporter;
}

async function sendEmail({ to, subject, html }) {
    const t = getTransporter();
    if (!t) return; // silently skip if not configured
    try {
        await t.sendMail({
            from: `"FreightFlow" <${process.env.EMAIL_USER}>`,
            to, subject, html
        });
        console.log(`📧 Email sent to ${to}: ${subject}`);
    } catch (err) {
        console.warn(`⚠️  Email failed to ${to}:`, err.message);
    }
}

async function sendShipmentAssigned({ driverEmail, driverName, trackingId, pickup, delivery }) {
    await sendEmail({
        to: driverEmail,
        subject: `🚛 New Job Assigned — ${trackingId}`,
        html: `
            <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
                <h2 style="color:#2563eb;margin-bottom:4px;">FreightFlow</h2>
                <h3>New Shipment Assigned to You</h3>
                <p>Hi ${driverName || 'Driver'},</p>
                <p>You have been assigned a new shipment:</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                    <tr><td style="padding:8px;color:#6b7280;">Tracking ID</td><td style="padding:8px;font-weight:bold;">${trackingId}</td></tr>
                    <tr style="background:#f9fafb;"><td style="padding:8px;color:#6b7280;">Pickup</td><td style="padding:8px;">${pickup}</td></tr>
                    <tr><td style="padding:8px;color:#6b7280;">Delivery</td><td style="padding:8px;">${delivery}</td></tr>
                </table>
                <a href="${process.env.FRONTEND_URL || 'https://truck-production.up.railway.app'}/pages/login.html"
                   style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">
                   Open Dashboard
                </a>
                <p style="color:#9ca3af;font-size:12px;margin-top:24px;">FreightFlow Logistics Platform</p>
            </div>
        `
    });
}

async function sendShipmentDelivered({ shipperEmail, shipperName, trackingId, pickup, delivery }) {
    await sendEmail({
        to: shipperEmail,
        subject: `✅ Shipment Delivered — ${trackingId}`,
        html: `
            <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
                <h2 style="color:#2563eb;margin-bottom:4px;">FreightFlow</h2>
                <h3 style="color:#16a34a;">Your Shipment Has Been Delivered! 🎉</h3>
                <p>Hi ${shipperName || 'there'},</p>
                <p>Your shipment has been successfully delivered:</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                    <tr><td style="padding:8px;color:#6b7280;">Tracking ID</td><td style="padding:8px;font-weight:bold;">${trackingId}</td></tr>
                    <tr style="background:#f9fafb;"><td style="padding:8px;color:#6b7280;">From</td><td style="padding:8px;">${pickup}</td></tr>
                    <tr><td style="padding:8px;color:#6b7280;">To</td><td style="padding:8px;">${delivery}</td></tr>
                </table>
                <p>Please log in to rate your driver and view the full delivery details.</p>
                <a href="${process.env.FRONTEND_URL || 'https://truck-production.up.railway.app'}/pages/login.html"
                   style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">
                   Rate Your Driver
                </a>
                <p style="color:#9ca3af;font-size:12px;margin-top:24px;">FreightFlow Logistics Platform</p>
            </div>
        `
    });
}

module.exports = { sendShipmentAssigned, sendShipmentDelivered };
