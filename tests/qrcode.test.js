const { createQrSvg } = require('../ui/qrcode.js');

describe('QR Code Generator Module', () => {
    test('should generate valid SVG for local dev URLs', () => {
        const svg = createQrSvg('http://192.168.1.100:3000', 160);
        expect(svg).toBeDefined();
        expect(svg).toContain('<svg');
        expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
        expect(svg).toContain('width="160"');
        expect(svg).toContain('<rect');
        expect(svg).toContain('</svg>');
    });

    test('should handle short and longer URLs by scaling typeNumber', () => {
        const svgShort = createQrSvg('http://10.0.0.2:80', 120);
        const svgLong = createQrSvg('http://192.168.15.220:5173/dashboard?preview=true', 200);

        expect(svgShort).toContain('width="120"');
        expect(svgLong).toContain('width="200"');
    });

    test('should safely handle empty or invalid inputs with fallback SVG', () => {
        const svgEmpty = createQrSvg('', 160);
        const svgNull = createQrSvg(null, 160);

        expect(svgEmpty).toContain('<svg');
        expect(svgEmpty).toContain('width="160"');
        expect(svgNull).toContain('<svg');
        expect(svgNull).toContain('width="160"');
    });
});
