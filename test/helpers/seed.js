/**
 * test/helpers/seed.js
 * Factory functions for seeding test data.
 * Always use these instead of direct model.create() in tests — it keeps
 * tests DRY and makes the intent of each test immediately clear.
 */

const User = require('../../models/User');
const Driver = require('../../models/Driver');
const Shipment = require('../../models/Shipment');
const supertest = require('supertest');

/**
 * Create a User document with sensible defaults.
 * @param {object} overrides - Any User field to override.
 * @returns {Promise<User>} The created User document.
 */
async function createUser(overrides = {}) {
    const timestamp = Date.now();
    return User.create({
        name: 'Test User',
        email: `test_${timestamp}@example.com`,
        phone: '9876543210',
        password: 'password123',
        role: 'shipper',
        ...overrides
    });
}

/**
 * Create an admin User.
 */
async function createAdmin() {
    return createUser({
        name: 'Admin User',
        email: `admin_${Date.now()}@freightflow.com`,
        role: 'admin'
    });
}

/**
 * Create a driver User AND their Driver profile document.
 * Returns both so tests can reference either.
 * @returns {Promise<{user: User, driver: Driver}>}
 */
async function createDriver(userOverrides = {}) {
    const user = await createUser({
        role: 'driver',
        email: `driver_${Date.now()}@example.com`,
        ...userOverrides
    });

    const driver = await Driver.create({
        user: user._id,
        vehicleType: 'Standard Truck (14ft)',
        vehicleNumber: `MH01AB${Math.floor(1000 + Math.random() * 9000)}`,
        licenseNumber: `DL${Math.floor(10000000 + Math.random() * 90000000)}`
    });

    return { user, driver };
}

/**
 * Create a Shipment linked to a shipper user.
 * Includes realistic pricing fields so tests don't hit missing-field errors.
 * @param {string|ObjectId} shipperId
 * @param {object} overrides
 */
async function createShipment(shipperId, overrides = {}) {
    return Shipment.create({
        shipper: shipperId,
        pickupLocation: { address: 'Mumbai, Maharashtra', city: 'Mumbai' },
        deliveryLocation: { address: 'Pune, Maharashtra', city: 'Pune' },
        cargo: {
            weight: 100,
            vehicleType: 'Standard Truck (14ft)',
            description: 'Test cargo'
        },
        pickupDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
        pricing: {
            basePrice: 1500,
            insurance: 50,
            taxes: 75,
            totalPrice: 1625,
            distance: 150
        },
        ...overrides
    });
}

/**
 * Login via the API and return the raw JWT access token string.
 * @param {object} app - The Express app exported from server.js
 * @param {string} email
 * @param {string} password - defaults to 'password123'
 * @returns {Promise<string>} The JWT token.
 */
async function loginUser(app, email, password = 'password123') {
    const res = await supertest(app)
        .post('/api/login')
        .send({ email, password });

    if (!res.body.token) {
        throw new Error(
            `loginUser failed for ${email}: ${res.status} — ${JSON.stringify(res.body)}`
        );
    }
    return res.body.token;
}

module.exports = { createUser, createAdmin, createDriver, createShipment, loginUser };
