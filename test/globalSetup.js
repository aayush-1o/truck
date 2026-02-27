/**
 * test/globalSetup.js
 * Runs ONCE before all test suites — starts the in-memory MongoDB server.
 * ⚠️  process.env changes here do NOT propagate to Jest worker processes.
 * We write the URI to a temp file so setup.js (running in workers) can read it.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MONGO_URI_FILE = path.join(os.tmpdir(), 'freightflow-test-mongo-uri.txt');

module.exports = async () => {
    const mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    // Write URI to temp file — workers read it in setup.js
    fs.writeFileSync(MONGO_URI_FILE, uri, 'utf-8');

    // Set for any code that runs in the setup process itself
    process.env.MONGODB_URI = uri;
    process.env.JWT_SECRET = 'test_jwt_secret_freightflow_2024';
    process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_freightflow_2024';
    process.env.NODE_ENV = 'test';
    process.env.CORS_ORIGIN = 'http://localhost:5000';

    // Store reference for globalTeardown
    global.__MONGOD__ = mongoServer;
    global.__MONGO_URI_FILE__ = MONGO_URI_FILE;
};
