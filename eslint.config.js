const js = require('@eslint/js');

module.exports = [
    js.configs.recommended,
    {
        files: ['*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'commonjs',
            globals: {
                require: 'readonly',
                module: 'readonly',
                process: 'readonly',
                __dirname: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                setInterval: 'readonly',
                document: 'readonly',
                window: 'readonly',
                alert: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-console': 'off',
            'prefer-const': 'error',
            'no-var': 'error'
        }
    },
    {
        ignores: ['node_modules/', 'dist/', 'dist-portable/', '__tests__/', 'jest.config.js']
    }
];
