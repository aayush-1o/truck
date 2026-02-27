/** jest.config.js */
module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/test/**/*.test.js'],
    globalSetup: './test/globalSetup.js',
    globalTeardown: './test/globalTeardown.js',
    setupFilesAfterEnv: ['./test/setup.js'],
    testTimeout: 30000,
    verbose: true,
    forceExit: true,
    detectOpenHandles: true,
    // Clear mocks between tests
    clearMocks: true,
    // Suppress console noise during tests
    silent: false
};
