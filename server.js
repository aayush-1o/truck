require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require("bcryptjs");
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Import models
const User = require('./models/User');

// Import middleware
const { generateToken } = require('./middleware/auth');

// Import routes
const shipmentRoutes = require('./routes/shipments');
const userRoutes = require('./routes/users');
const driverRoutes = require('./routes/drivers');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files (HTML, CSS, JS) from project root

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
app.post('/api/register', async (req, res) => {
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
app.post('/api/login', async (req, res) => {
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
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "No account found with this email"
            });
        }

        // Create token
        const token = crypto.randomBytes(32).toString("hex");
        const expireTime = Date.now() + 10 * 60 * 1000; // 10 min

        user.resetToken = token;
        user.resetTokenExpires = expireTime;
        await user.save();

        // Send email
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5500'}/pages/reset-password.html?token=${token}`;

        await transporter.sendMail({
            from: process.env.EMAIL_USER || "FreightFlow Support",
            to: email,
            subject: "Reset Your Password",
            html: `
                <h2>Password Reset Request</h2>
                <p>Click the link below to reset your password:</p>
                <a href="${resetLink}">${resetLink}</a>
                <p>This link is valid for 10 minutes.</p>
            `
        });

        res.json({
            success: true,
            message: "Password reset link sent to your email"
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
    app.listen(port, () =>
        console.log(`🚀 Server running: http://localhost:${port}`)
    );
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await mongoose.connection.close();
    process.exit(0);
});
