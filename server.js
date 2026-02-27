require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Import models
const User = require('./models/User');

// Import middleware
const { generateToken } = require('./middleware/auth');
const { validateRegister, validateLogin, handleValidationErrors } = require('./middleware/validator');

// Import utils
const { sendEmail } = require('./utils/email');

// Import routes
const shipmentRoutes = require('./routes/shipments');
const userRoutes = require('./routes/users');
const driverRoutes = require('./routes/drivers');
const paymentRoutes = require('./routes/payments');
const notificationRoutes = require('./routes/notifications');

// ===============================
// FAIL-FAST: Validate critical env vars before anything else
// ===============================
const requiredEnv = ['MONGODB_URI', 'JWT_SECRET'];
for (const key of requiredEnv) {
    if (!process.env[key]) {
        console.error(`❌ Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

// ===============================
// RATE LIMITERS
// ===============================
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' }
});

const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many reset requests. Please try again in 1 hour.' }
});

const app = express();
const httpServer = http.createServer(app);

// Socket.io — Real-time driver location broadcasts
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN
            ? process.env.CORS_ORIGIN.split(',')
            : ['http://localhost:5000', 'http://localhost:5500'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Make io accessible to routes
app.set('io', io);

io.on('connection', (socket) => {
    // Driver joins a room with their userId so admins can track
    socket.on('join', (userId) => {
        socket.join(userId);
    });

    // Driver emits location update
    socket.on('location:update', (data) => {
        // data: { driverId, lat, lng, shipmentId }
        // Broadcast to admin room
        io.to('admin-room').emit('driver:location', data);
    });

    // Admin joins admin room
    socket.on('join:admin', () => {
        socket.join('admin-room');
    });

    socket.on('disconnect', () => {
        // cleanup handled by socket.io automatically
    });
});

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',')
        : ['http://localhost:5000', 'http://localhost:5500'],
    credentials: true
}));
app.use(express.json());
// Serve static files ONLY from /public — prevents .env, seed.js, etc. from being downloadable
app.use(express.static(path.join(__dirname, 'public')));

// ENV
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/freightflow';
const port = process.env.PORT || 5000;

// CONNECT TO MONGODB using Mongoose
async function connectDB() {
    try {
        await mongoose.connect(uri);
        console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}`);
    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err.message);
        process.exit(1);
    }
}

// ===============================
// 1️⃣ USER REGISTRATION
// ===============================
app.post('/api/register', authLimiter, validateRegister, handleValidationErrors, async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }

        // Check if user exists
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: "User already exists with this email"
            });
        }

        // Create user (password will be hashed by pre-save middleware)
        const user = await User.create({
            name,
            email,
            phone,
            password,
            role: role || 'shipper'
        });

        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: user.toPublicJSON()
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({
            success: false,
            message: "Server error during registration",
            error: err.message
        });
    }
});

// ===============================
// 2️⃣ USER LOGIN
// ===============================
app.post('/api/login', authLimiter, validateLogin, handleValidationErrors, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Find user and include password field
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found with this email"
            });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Your account has been deactivated. Contact support."
            });
        }

        // Compare password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid password"
            });
        }

        // Generate JWT token
        const token = generateToken(user._id, user.role);

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                fullname: user.name // For compatibility with existing frontend
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            success: false,
            message: "Server error during login",
            error: err.message
        });
    }
});

// ===============================
// 3️⃣ FORGOT PASSWORD — Send Email
// ===============================
app.post('/api/forgot-password', forgotPasswordLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });

        // Security: always return 200 — never reveal whether an email is registered
        if (!user) {
            return res.json({
                success: true,
                message: "If an account exists with this email, a reset link has been sent."
            });
        }

        // Create token
        const token = crypto.randomBytes(32).toString("hex");
        const expireTime = Date.now() + 10 * 60 * 1000; // 10 min

        user.resetToken = token;
        user.resetTokenExpires = expireTime;
        await user.save();

        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/pages/reset-password.html?token=${token}`;

        // Use the singleton transporter from utils/email.js
        await sendEmail({
            to: email,
            subject: 'Reset Your Password — FreightFlow',
            html: `
                <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:24px;">
                    <h2 style="color:#2563eb;">FreightFlow</h2>
                    <h3>Password Reset Request</h3>
                    <p>Click the link below to reset your password:</p>
                    <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;">Reset Password</a>
                    <p style="color:#6b7280;font-size:13px;margin-top:16px;">This link expires in 10 minutes. If you didn't request a reset, ignore this email.</p>
                </div>
            `
        });

        res.json({
            success: true,
            message: "If an account exists with this email, a reset link has been sent."
        });

    } catch (err) {
        console.error("Forgot password error:", err);
        res.status(500).json({
            success: false,
            message: "Server error. Please try again.",
            error: err.message
        });
    }
});

// ===============================
// 4️⃣ VERIFY TOKEN
// ===============================
app.post('/api/verify-token', async (req, res) => {
    try {
        const { token } = req.body;

        const user = await User.findOne({
            resetToken: token,
            resetTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        res.json({
            success: true,
            message: "Token is valid"
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
});

// ===============================
// 5️⃣ RESET PASSWORD
// ===============================
app.post('/api/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        const user = await User.findOne({
            resetToken: token,
            resetTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        // Update password (will be hashed by pre-save middleware)
        user.password = newPassword;
        user.resetToken = undefined;
        user.resetTokenExpires = undefined;
        await user.save();

        res.json({
            success: true,
            message: "Password reset successfully"
        });

    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
});

// ===============================
// API ROUTES
// ===============================
app.use('/api/shipments', shipmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);

// ===============================
// HEALTH CHECK
// ===============================
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString()
    });
});

// ===============================
// ERROR HANDLER
// ===============================
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// ===============================
// START SERVER
// ===============================
connectDB().then(() => {
    httpServer.listen(port, () => {
        console.log(`🚀 Server running: http://localhost:${port}`);
        console.log(`🔌 Socket.io ready for real-time events`);
        if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'rzp_test_YOUR_KEY_ID') {
            console.log(`⚠️  Razorpay not configured — add RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET to .env to enable payments`);
        } else {
            console.log(`💳 Razorpay payment gateway active`);
        }
    });
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await mongoose.connection.close();
    process.exit(0);
});
