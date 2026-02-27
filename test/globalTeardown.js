/**
 * test/globalTeardown.js
 * Runs ONCE after all test suites — stops the in-memory MongoDB server.
 */
module.exports = async () => {
    if (global.__MONGOD__) {
        await global.__MONGOD__.stop();
    }
};
