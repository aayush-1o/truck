/**
 * test/setup.js
 * Runs in each Jest worker process before its test suite.
 * Reads MongoDB URI from the temp file written by globalSetup.js
 * (process.env from globalSetup does NOT propagate to worker processes).
 */
const mongoose = require('mongoose');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MONGO_URI_FILE = path.join(os.tmpdir(), 'freightflow-test-mongo-uri.txt');

// Set required env vars in THIS worker process
// These override whatever .env loaded, ensuring test secrets are used
process.env.JWT_SECRET = 'test_jwt_secret_freightflow_2024';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_freightflow_2024';
process.env.NODE_ENV = 'test';
process.env.CORS_ORIGIN = 'http://localhost:5000';

// Connect before each suite
beforeAll(async () => {
    // Read URI from temp file — set by globalSetup in a different process
    const mongoUri = fs.readFileSync(MONGO_URI_FILE, 'utf-8').trim();
    process.env.MONGODB_URI = mongoUri;

    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(mongoUri);
    }
}, 30000);

// Wipe all collections between each test for isolation
beforeEach(async () => {
    if (mongoose.connection.readyState !== 1) return;
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

// Disconnect after the suite finishes
afterAll(async () => {
    await mongoose.disconnect();
});
