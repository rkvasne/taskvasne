const { extractProjectName } = require('../port-manager');

describe('Port Manager - extractProjectName', () => {
    describe('Valid path extraction', () => {
        test('should extract project name from node.js command line', () => {
            const cmdLine = '"C:\\Program Files\\nodejs\\node.exe" "C:\\Users\\dev\\projects\\my-api\\server.js"';
            const result = extractProjectName(cmdLine, 'node.exe');
            expect(result).toBe('my-api');
        });

        test('should extract project name from Python command line', () => {
            const cmdLine = 'C:\\Python311\\python.exe C:\\workspace\\flask-app\\main.py';
            const result = extractProjectName(cmdLine, 'python.exe');
            expect(result).toBe('flask-app');
        });

        test('should extract project name from Java command line', () => {
            const cmdLine = '"C:\\Program Files\\Java\\jdk\\bin\\java.exe" -jar C:\\apps\\spring-boot\\app.jar';
            const result = extractProjectName(cmdLine, 'java.exe');
            expect(result).toBe('spring-boot');
        });
    });

    describe('Ignored folders', () => {
        test('should skip "dist" folder and use parent folder', () => {
            const cmdLine = 'node.exe C:\\projects\\taskvasne\\dist\\server.js';
            const result = extractProjectName(cmdLine, 'node.exe');
            expect(result).toBe('taskvasne');
        });

        test('should skip "build" folder and use parent folder', () => {
            const cmdLine = 'node.exe C:\\apps\\my-app\\build\\index.js';
            const result = extractProjectName(cmdLine, 'node.exe');
            expect(result).toBe('my-app');
        });

        test('should skip "src" folder and use parent folder', () => {
            const cmdLine = 'python.exe C:\\dev\\api-server\\src\\main.py';
            const result = extractProjectName(cmdLine, 'python.exe');
            expect(result).toBe('api-server');
        });

        test('should skip "bin" folder and use parent folder', () => {
            const cmdLine = 'java.exe C:\\workspace\\backend\\bin\\app.class';
            const result = extractProjectName(cmdLine, 'java.exe');
            expect(result).toBe('backend');
        });

        test('should skip "lib" folder and use parent folder', () => {
            const cmdLine = 'node.exe C:\\code\\express-api\\lib\\server.js';
            const result = extractProjectName(cmdLine, 'node.exe');
            expect(result).toBe('express-api');
        });
    });

    describe('Edge cases', () => {
        test('should return null for empty command line', () => {
            const result = extractProjectName('', 'node.exe');
            expect(result).toBeNull();
        });

        test('should return null when no valid path found', () => {
            const cmdLine = 'node.exe --version';
            const result = extractProjectName(cmdLine, 'node.exe');
            expect(result).toBeNull();
        });

        test('should ignore path that ends with process name', () => {
            const cmdLine = '"C:\\Program Files\\nodejs\\node.exe"';
            const result = extractProjectName(cmdLine, 'node.exe');
            expect(result).toBeNull();
        });

        test('should handle command line with multiple arguments', () => {
            const cmdLine = 'node.exe --inspect C:\\dev\\api\\server.js --port 3000';
            const result = extractProjectName(cmdLine, 'node.exe');
            expect(result).toBe('api');
        });

        test('should handle paths with spaces', () => {
            const cmdLine = '"node.exe" "C:\\My Projects\\web app\\index.js"';
            const result = extractProjectName(cmdLine, 'node.exe');
            expect(result).toBe('web app');
        });

        test('should handle folder names without file extension in last part', () => {
            const cmdLine = 'python.exe C:\\apps\\my-script\\runner';
            const result = extractProjectName(cmdLine, 'python.exe');
            expect(result).toBe('runner');
        });
    });

    describe('Error handling', () => {
        test('should return null on malformed path', () => {
            const cmdLine = 'invalid:::path';
            const result = extractProjectName(cmdLine, 'node.exe');
            expect(result).toBeNull();
        });

        test('should handle null command line gracefully', () => {
            const result = extractProjectName(null, 'node.exe');
            expect(result).toBeNull();
        });

        test('should handle undefined command line gracefully', () => {
            const result = extractProjectName(undefined, 'node.exe');
            expect(result).toBeNull();
        });
    });
});
