/**
 * middleware/auth.js
 * JWT authentication and role-based authorization middleware.
 *
 * Two-token system:
 * - Access token: 15-minute expiry, returned in JSON body
 * - Refresh token: 7-day expiry, stored in HttpOnly cookie
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ===============================
// COOKIE OPTIONS for refresh token
// httpOnly:  JS cannot read — XSS-safe
// secure:    HTTPS only in production
// sameSite:  CSRF protection
// maxAge:    7 days in ms
// ===============================
const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

exports.REFRESH_COOKIE_OPTIONS = REFRESH_COOKIE_OPTIONS;

// ===============================
// TOKEN GENERATORS
// ===============================

/**
 * 15-minute access token — returned in JSON body, stored in localStorage.
 * Short expiry limits damage if intercepted.
 */
exports.generateAccessToken = (userId, role) =>
    jwt.sign(
        { id: userId, role },
        process.env.JWT_SECRET, // No fallback — server.js enforces this is set
        { expiresIn: '15m' }
    );

/**
 * 7-day refresh token — stored in HttpOnly cookie only.
 * Note: does NOT include role — always fetch fresh role from DB on refresh.
 */
exports.generateRefreshToken = (userId) =>
    jwt.sign(
        { id: userId },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
        { expiresIn: '7d' }
    );

/**
 * Backward-compat alias. Some routes (e.g. seed scripts) still call generateToken.
 * Routes that went through the login handler already use generateAccessToken.
 */
exports.generateToken = exports.generateAccessToken;

// ===============================
// PROTECT MIDDLEWARE
// Verifies JWT on every protected route.
// Hits the DB to check isActive — so deactivation works immediately.
// ===============================
exports.protect = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route. Please login.'
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found. Token is invalid.'
                });
            }

            if (!req.user.isActive) {
                return res.status(401).json({
                    success: false,
                    message: 'Your account has been deactivated.'
                });
            }

            next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Token is invalid or expired. Please login again.'
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server error in authentication'
        });
    }
};

// ===============================
// AUTHORIZE MIDDLEWARE
// Factory — wraps a middleware that checks req.user.role.
// Usage: authorize('admin'), authorize('driver', 'admin')
// ===============================
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized. Please login first.'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role '${req.user.role}' is not authorized to access this route`
            });
        }

        next();
    };
};
