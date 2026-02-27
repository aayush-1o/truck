/**
 * seed.js - Creates an admin user in the database
 * Run with: node seed.js
 * 
 * Usage:
 *   node seed.js
 *   node seed.js --email admin@mycompany.com --password mypassword123
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const User = require('./models/User');

// Parse CLI args for email/password
const args = process.argv.slice(2);
const getArg = (name) => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 ? args[idx + 1] : null;
};

const DEFAULT_ADMIN = {
    name: 'Super Admin',
    email: getArg('email') || 'admin@freightflow.com',
    phone: '9999999999',
    password: getArg('password') || 'admin123456',
    role: 'admin'
};

async function createAdmin() {
    console.log('\n🛠  FreightFlow Admin Seed Script');
    console.log('================================');

    try {
        // Connect to MongoDB
        console.log(`\n📡 Connecting to: ${process.env.MONGODB_URI}`);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Check if admin already exists
        const existing = await User.findOne({ email: DEFAULT_ADMIN.email });

        if (existing) {
            if (existing.role === 'admin') {
                console.log(`⚠️  Admin already exists: ${DEFAULT_ADMIN.email}`);
                console.log('   To update password, delete the user first or use MongoDB Compass.\n');
            } else {
                // Upgrade existing user to admin
                existing.role = 'admin';
                await existing.save();
                console.log(`✅ Upgraded ${DEFAULT_ADMIN.email} to admin role!\n`);
            }
        } else {
            // Create new admin
            await User.create(DEFAULT_ADMIN);
            console.log('✅ Admin user created successfully!\n');
        }

        console.log('📋 Admin Login Credentials:');
        console.log('────────────────────────────');
        console.log(`   Email:    ${DEFAULT_ADMIN.email}`);
        console.log(`   Password: ${DEFAULT_ADMIN.password}`);
        console.log('────────────────────────────');
        console.log('\n🌐 Login at: http://localhost:5000/pages/login.html');
        console.log('   or open pages/login.html in your browser\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

createAdmin();
