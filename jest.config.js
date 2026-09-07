module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.js'],
    collectCoverageFrom: [
        'ui/i18n.js'
    ],
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 60,
            lines: 60,
            statements: 60
        }
    },
    modulePathIgnorePatterns: [
        '<rootDir>/dist-portable/',
        '<rootDir>/src-tauri/'
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/src-tauri/'
    ],
    watchPathIgnorePatterns: [
        '<rootDir>/dist-portable/',
        '<rootDir>/src-tauri/'
    ]
};
