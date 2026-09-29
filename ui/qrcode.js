/**
 * Minimalist Pure JavaScript QR Code Generator for Taskvasne
 * Generates clean SVG markup for local URLs without external dependencies.
 * Based on Kazuhiko Arase's QR Code algorithm (MIT/Public Domain).
 */

const QRMode = {
    MODE_8BIT_BYTE: 1 << 2
};

const QRErrorCorrectLevel = {
    L: 1,
    M: 0,
    Q: 3,
    H: 2
};

const QRMaskPattern = {
    PATTERN000: 0,
    PATTERN001: 1,
    PATTERN010: 2,
    PATTERN011: 3,
    PATTERN100: 4,
    PATTERN101: 5,
    PATTERN110: 6,
    PATTERN111: 7
};

const QRMath = {
    glog(n) {
        if (n < 1) throw new Error(`glog(${n})`);
        return QRMath.LOG_TABLE[n];
    },
    gexp(n) {
        while (n < 0) n += 255;
        while (n >= 256) n -= 255;
        return QRMath.EXP_TABLE[n];
    },
    EXP_TABLE: new Array(256),
    LOG_TABLE: new Array(256)
};

for (let i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
for (let i = 8; i < 256; i++) {
    QRMath.EXP_TABLE[i] =
        QRMath.EXP_TABLE[i - 4] ^
        QRMath.EXP_TABLE[i - 5] ^
        QRMath.EXP_TABLE[i - 6] ^
        QRMath.EXP_TABLE[i - 8];
}
for (let i = 0; i < 255; i++) QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;

class QRPolynomial {
    constructor(num, shift) {
        let offset = 0;
        while (offset < num.length && num[offset] === 0) offset++;
        this.num = new Array(num.length - offset + shift);
        for (let i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
    }
    get(index) {
        return this.num[index];
    }
    getLength() {
        return this.num.length;
    }
    multiply(e) {
        const num = new Array(this.getLength() + e.getLength() - 1).fill(0);
        for (let i = 0; i < this.getLength(); i++) {
            for (let j = 0; j < e.getLength(); j++) {
                num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
            }
        }
        return new QRPolynomial(num, 0);
    }
    mod(e) {
        if (this.getLength() - e.getLength() < 0) return this;
        const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
        const num = new Array(this.getLength());
        for (let i = 0; i < this.getLength(); i++) num[i] = this.get(i);
        for (let i = 0; i < e.getLength(); i++) {
            num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
        }
        return new QRPolynomial(num, 0).mod(e);
    }
}

class QR8bitByte {
    constructor(data) {
        this.mode = QRMode.MODE_8BIT_BYTE;
        this.data = data;
    }
    getLength() {
        return this.data.length;
    }
    write(buffer) {
        for (let i = 0; i < this.data.length; i++) {
            buffer.put(this.data.charCodeAt(i), 8);
        }
    }
}

class QRBitBuffer {
    constructor() {
        this.buffer = [];
        this.length = 0;
    }
    get(index) {
        const bufIndex = Math.floor(index / 8);
        return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
    }
    put(num, length) {
        for (let i = 0; i < length; i++) {
            this.putBit(((num >>> (length - i - 1)) & 1) === 1);
        }
    }
    putBit(bit) {
        const bufIndex = Math.floor(this.length / 8);
        if (this.buffer.length <= bufIndex) this.buffer.push(0);
        if (bit) this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
        this.length++;
    }
}

const QRRSBlock = {
    RS_BLOCK_TABLE: [
        [1, 26, 19],
        [1, 26, 16],
        [1, 26, 13],
        [1, 26, 9],
        [1, 44, 34],
        [1, 44, 28],
        [1, 44, 22],
        [1, 44, 16],
        [1, 70, 55],
        [1, 70, 44],
        [2, 35, 17],
        [2, 35, 13],
        [1, 100, 80],
        [2, 50, 32],
        [2, 50, 24],
        [4, 25, 9]
    ],
    getRSBlocks(typeNumber, errorCorrectLevel) {
        const rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
        const list = [];
        for (let i = 0; i < rsBlock.length / 3; i++) {
            const count = rsBlock[i * 3 + 0];
            const totalCount = rsBlock[i * 3 + 1];
            const dataCount = rsBlock[i * 3 + 2];
            for (let j = 0; j < count; j++) {
                list.push({ totalCount, dataCount });
            }
        }
        return list;
    },
    getRsBlockTable(typeNumber, errorCorrectLevel) {
        switch (errorCorrectLevel) {
            case QRErrorCorrectLevel.L:
                return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
            case QRErrorCorrectLevel.M:
                return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
            case QRErrorCorrectLevel.Q:
                return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
            case QRErrorCorrectLevel.H:
                return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
            default:
                return undefined;
        }
    }
};

class QRCodeModel {
    constructor(typeNumber, errorCorrectLevel) {
        this.typeNumber = typeNumber;
        this.errorCorrectLevel = errorCorrectLevel;
        this.modules = null;
        this.moduleCount = 0;
        this.dataCache = null;
        this.dataList = [];
    }

    addData(data) {
        this.dataList.push(new QR8bitByte(data));
        this.dataCache = null;
    }

    isDark(row, col) {
        if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
            throw new Error(`${row},${col}`);
        }
        return this.modules[row][col];
    }

    getModuleCount() {
        return this.moduleCount;
    }

    make() {
        this.makeImpl(false, this.getBestMaskPattern());
    }

    makeImpl(test, maskPattern) {
        this.moduleCount = this.typeNumber * 4 + 17;
        this.modules = new Array(this.moduleCount);
        for (let row = 0; row < this.moduleCount; row++) {
            this.modules[row] = new Array(this.moduleCount).fill(null);
        }
        this.setupPositionProbePattern(0, 0);
        this.setupPositionProbePattern(this.moduleCount - 7, 0);
        this.setupPositionProbePattern(0, this.moduleCount - 7);
        this.setupTimingPattern();
        this.setupTypeInfo(test, maskPattern);
        if (this.dataCache == null) {
            this.dataCache = QRCodeModel.createData(
                this.typeNumber,
                this.errorCorrectLevel,
                this.dataList
            );
        }
        this.mapData(this.dataCache, maskPattern);
    }

    setupPositionProbePattern(row, col) {
        for (let r = -1; r <= 7; r++) {
            if (row + r <= -1 || this.moduleCount <= row + r) continue;
            for (let c = -1; c <= 7; c++) {
                if (col + c <= -1 || this.moduleCount <= col + c) continue;
                if (
                    (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
                    (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
                    (2 <= r && r <= 4 && 2 <= c && c <= 4)
                ) {
                    this.modules[row + r][col + c] = true;
                } else {
                    this.modules[row + r][col + c] = false;
                }
            }
        }
    }

    getBestMaskPattern() {
        return QRMaskPattern.PATTERN000;
    }

    setupTimingPattern() {
        for (let r = 8; r < this.moduleCount - 8; r++) {
            if (this.modules[r][6] != null) continue;
            this.modules[r][6] = r % 2 === 0;
        }
        for (let c = 8; c < this.moduleCount - 8; c++) {
            if (this.modules[6][c] != null) continue;
            this.modules[6][c] = c % 2 === 0;
        }
    }

    setupTypeInfo(test, maskPattern) {
        const data = (this.errorCorrectLevel << 3) | maskPattern;
        const bits = QRCodeModel.getBCHTypeInfo(data);
        for (let i = 0; i < 15; i++) {
            const mod = !test && ((bits >> i) & 1) === 1;
            if (i < 6) this.modules[i][8] = mod;
            else if (i < 8) this.modules[i + 1][8] = mod;
            else this.modules[this.moduleCount - 15 + i][8] = mod;

            if (i < 8) this.modules[8][this.moduleCount - i - 1] = mod;
            else if (i < 9) this.modules[8][15 - i - 1 + 1] = mod;
            else this.modules[8][15 - i - 1] = mod;
        }
        this.modules[this.moduleCount - 8][8] = !test;
    }

    mapData(data, maskPattern) {
        let inc = -1;
        let row = this.moduleCount - 1;
        let bitIndex = 7;
        let byteIndex = 0;

        for (let col = this.moduleCount - 1; col > 0; col -= 2) {
            if (col === 6) col--;
            while (true) {
                for (let c = 0; c < 2; c++) {
                    if (this.modules[row][col - c] == null) {
                        let dark = false;
                        if (byteIndex < data.length) {
                            dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
                        }
                        const mask = (row + (col - c)) % 2 === 0;
                        if (maskPattern === QRMaskPattern.PATTERN000 && mask) dark = !dark;
                        this.modules[row][col - c] = dark;
                        bitIndex--;
                        if (bitIndex === -1) {
                            byteIndex++;
                            bitIndex = 7;
                        }
                    }
                }
                row += inc;
                if (row < 0 || this.moduleCount <= row) {
                    row -= inc;
                    inc = -inc;
                    break;
                }
            }
        }
    }

    static getBCHTypeInfo(data) {
        let d = data << 10;
        while (QRCodeModel.getBCHDigit(d) - QRCodeModel.getBCHDigit(1335) >= 0) {
            d ^= 1335 << (QRCodeModel.getBCHDigit(d) - QRCodeModel.getBCHDigit(1335));
        }
        return ((data << 10) | d) ^ 21522;
    }

    static getBCHDigit(data) {
        let digit = 0;
        while (data !== 0) {
            digit++;
            data >>>= 1;
        }
        return digit;
    }

    static createData(typeNumber, errorCorrectLevel, dataList) {
        const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
        const buffer = new QRBitBuffer();
        for (let i = 0; i < dataList.length; i++) {
            const data = dataList[i];
            buffer.put(data.mode, 4);
            buffer.put(data.getLength(), 8);
            data.write(buffer);
        }
        let totalDataCount = 0;
        for (let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
        if (buffer.length + 4 <= totalDataCount * 8) buffer.put(0, 4);
        while (buffer.length % 8 !== 0) buffer.putBit(false);
        while (true) {
            if (buffer.length >= totalDataCount * 8) break;
            buffer.put(0xec, 8);
            if (buffer.length >= totalDataCount * 8) break;
            buffer.put(0x11, 8);
        }
        return QRCodeModel.createBytes(buffer, rsBlocks);
    }

    static createBytes(buffer, rsBlocks) {
        let offset = 0;
        let maxDcCount = 0;
        let maxEcCount = 0;
        const dcdata = new Array(rsBlocks.length);
        const ecdata = new Array(rsBlocks.length);

        for (let r = 0; r < rsBlocks.length; r++) {
            const dcCount = rsBlocks[r].dataCount;
            const ecCount = rsBlocks[r].totalCount - dcCount;
            maxDcCount = Math.max(maxDcCount, dcCount);
            maxEcCount = Math.max(maxEcCount, ecCount);

            dcdata[r] = new Array(dcCount);
            for (let i = 0; i < dcdata[r].length; i++) {
                dcdata[r][i] = 0xff & buffer.buffer[i + offset];
            }
            offset += dcCount;

            const rsPoly = QRCodeModel.getErrorCorrectPolynomial(ecCount);
            const rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
            const modPoly = rawPoly.mod(rsPoly);
            ecdata[r] = new Array(rsPoly.getLength() - 1);
            for (let i = 0; i < ecdata[r].length; i++) {
                const modIndex = i + modPoly.getLength() - ecdata[r].length;
                ecdata[r][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
            }
        }

        let totalCodeCount = 0;
        for (let i = 0; i < rsBlocks.length; i++) totalCodeCount += rsBlocks[i].totalCount;
        const data = new Array(totalCodeCount);
        let index = 0;

        for (let i = 0; i < maxDcCount; i++) {
            for (let r = 0; r < rsBlocks.length; r++) {
                if (i < dcdata[r].length) data[index++] = dcdata[r][i];
            }
        }
        for (let i = 0; i < maxEcCount; i++) {
            for (let r = 0; r < rsBlocks.length; r++) {
                if (i < ecdata[r].length) data[index++] = ecdata[r][i];
            }
        }
        return data;
    }

    static getErrorCorrectPolynomial(errorCorrectLength) {
        let a = new QRPolynomial([1], 0);
        for (let i = 0; i < errorCorrectLength; i++) {
            a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
        }
        return a;
    }
}

/**
 * Generates an SVG string representing the QR Code for text
 * @param {string} text - URL or text to encode
 * @param {number} size - Output pixel dimension (width/height)
 * @returns {string} SVG string
 */
function createQrSvg(text, size = 160) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="#ffffff"/></svg>`;
    }

    let typeNumber = 2;
    if (text.length > 25) typeNumber = 3;
    if (text.length > 45) typeNumber = 4;

    const safeText = text.length > 78 ? text.slice(0, 78) : text;

    const qr = new QRCodeModel(typeNumber, QRErrorCorrectLevel.L);
    qr.addData(safeText);
    qr.make();

    const count = qr.getModuleCount();
    const cellSize = (size / count).toFixed(2);
    let rects = '';

    for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
            if (qr.isDark(r, c)) {
                const x = (c * cellSize).toFixed(2);
                const y = (r * cellSize).toFixed(2);
                rects += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="#000000" />`;
            }
        }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="#ffffff"/>${rects}</svg>`;
}

// Export for browser and node/jest
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createQrSvg, QRCodeModel };
} else {
    window.createQrSvg = createQrSvg;
}
