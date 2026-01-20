module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    '*.js',
    '!main.js', // Skip main.js (requires Electron runtime)
    '!preload.js',
    '!preload-about.js',
    '!renderer.js', // Skip renderer (requires DOM)
    '!convert-icon.js',
    '!jest.config.js'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  modulePathIgnorePatterns: ['<rootDir>/dist-portable/'],
  watchPathIgnorePatterns: ['<rootDir>/dist-portable/']
};
