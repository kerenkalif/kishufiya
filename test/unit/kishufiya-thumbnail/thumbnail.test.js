// The picture of the stage a save sends for "המשחקים שלי" (lib/kishufiya-thumbnail.js): its PNG fits the platform's
// limit (KidsTeachingPlatform src/lib/limits.ts MAX_THUMBNAIL_BYTES) whatever the stage shows.
//   npm run test:thumb    (by hand: CI runs only test:unit; zlib.crc32 needs Node 20.15 or 22.2 and later)
import zlib from 'zlib';
import {
    OTHER_CHUNKS,
    PLATFORM_MAX_THUMBNAIL_BYTES,
    THUMBNAIL_HEIGHT,
    THUMBNAIL_WIDTH,
    fitInside,
    pngUpperBound,
    zlibBound
} from '../../../src/lib/kishufiya-thumbnail.js';

const W = THUMBNAIL_WIDTH;
const H = THUMBNAIL_HEIGHT;
const ROW = 1 + (4 * W); // a row as the PNG deflates it: its filter byte, then 4 bytes a pixel
const ROWS = H * ROW;
const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// The rows of a picture that does not compress, the same on every run (xorshift32): the worst a stage can give the
// encoder. Each row opens with filter 0 (none), as in a real PNG.
const noise = () => {
    const rows = Buffer.alloc(ROWS);
    let x = 2463534242;
    for (let i = 0; i < ROWS; i++) {
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        if (i % ROW !== 0) rows[i] = x & 255;
    }
    return rows;
};

// A chunk as the PNG format has it: the length of its data, its type, the data, and the CRC of the type and data.
const chunk = (type, data = Buffer.alloc(0)) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const typed = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(typed));
    return Buffer.concat([length, typed, crc]);
};

// A whole PNG of width x height in 8-bit RGBA around a zlib stream, as libpng writes one: the signature, IHDR, the
// stream in IDAT chunks of 8192 bytes (its PNG_ZBUF_SIZE), IEND. Nothing else: that is OTHER_CHUNKS's room.
const pngFile = (width, height, stream) => {
    const header = Buffer.alloc(13); // compression, filter and interlace stay 0
    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header[8] = 8; // bits a channel
    header[9] = 6; // RGBA
    const idat = [];
    for (let at = 0; at < stream.length; at += 8192) idat.push(chunk('IDAT', stream.subarray(at, at + 8192)));
    return Buffer.concat([SIGNATURE, chunk('IHDR', header), ...idat, chunk('IEND')]);
};

describe('the picture of the stage for "המשחקים שלי"', () => {
    test('is 4:3, as the stage and the card', () => {
        expect(W * 3).toBe(H * 4);
    });

    test("the limit is the platform's own number: changed here alone, this fails", () => {
        expect(PLATFORM_MAX_THUMBNAIL_BYTES).toBe(300000); // KidsTeachingPlatform src/lib/limits.ts
    });

    test("its PNG can never pass the platform's limit", () => {
        expect(pngUpperBound(W, H)).toBeLessThan(PLATFORM_MAX_THUMBNAIL_BYTES);
    });

    test('a whole PNG of pixels that do not compress fits, at every zlib level and both strategies libpng uses', () => {
        const rows = noise();
        const {Z_DEFAULT_STRATEGY, Z_FILTERED} = zlib.constants;
        for (const strategy of [Z_DEFAULT_STRATEGY, Z_FILTERED]) {
            for (let level = 0; level <= 9; level++) {
                const stream = zlib.deflateSync(rows, {level, strategy, windowBits: 15, memLevel: 8});
                expect(stream.length).toBeGreaterThan(ROWS); // nothing compressed: the worst case
                expect(stream.length).toBeLessThanOrEqual(zlibBound(ROWS));
                // the file itself, without the room left for an encoder's other chunks
                expect(pngFile(W, H, stream).length).toBeLessThanOrEqual(pngUpperBound(W, H) - OTHER_CHUNKS);
            }
        }
    });

    test('the PNG built here is a PNG: its chunks in order, and its IDAT data inflates back to the pixels', () => {
        const rows = noise();
        const file = pngFile(W, H, zlib.deflateSync(rows));
        expect(file.subarray(0, 8).equals(SIGNATURE)).toBe(true);
        const types = [];
        const idat = [];
        for (let at = 8; at < file.length; at += 12 + file.readUInt32BE(at)) {
            const end = at + 8 + file.readUInt32BE(at);
            expect(file.readUInt32BE(end)).toBe(zlib.crc32(file.subarray(at + 4, end)));
            types.push(file.toString('ascii', at + 4, at + 8));
            if (types[types.length - 1] === 'IDAT') idat.push(file.subarray(at + 8, end));
        }
        expect(types[0]).toBe('IHDR');
        expect(types[types.length - 1]).toBe('IEND');
        expect(types.length).toBe(idat.length + 2);
        expect(zlib.inflateSync(Buffer.concat(idat)).equals(rows)).toBe(true);
    });

    test('the bound is never below the pixels themselves', () => {
        expect(pngUpperBound(W, H)).toBeGreaterThan(ROWS);
    });

    test('a larger picture would not be safe: 320x240, or the stage at its own 480x360', () => {
        expect(pngUpperBound(320, 240)).toBeGreaterThan(PLATFORM_MAX_THUMBNAIL_BYTES);
        expect(pngUpperBound(480, 360)).toBeGreaterThan(PLATFORM_MAX_THUMBNAIL_BYTES);
    });
});

describe('the stage inside the picture', () => {
    test('a 4:3 stage fills it, at any size and pixel ratio', () => {
        for (const [w, h] of [[480, 360], [720, 540], [1440, 1080], [600, 450], [160, 120]]) {
            expect(fitInside(w, h)).toEqual({x: 0, y: 0, width: W, height: H});
        }
    });

    test('a canvas a pixel off 4:3 fills it too', () => {
        expect(fitInside(601, 450)).toEqual({x: 0, y: 0, width: W, height: H});
        expect(fitInside(600, 451)).toEqual({x: 0, y: 0, width: W, height: H});
        expect(fitInside(517, 388)).toEqual({x: 0, y: 0, width: W, height: H});
    });

    test('another shape is whole, in the middle, between bars', () => {
        expect(fitInside(640, 360, 300, 225)).toEqual({x: 0, y: 28, width: 300, height: 169});
        expect(fitInside(360, 480, 300, 225)).toEqual({x: 65, y: 0, width: 169, height: 225});
    });

    test('a picture with no size has no place', () => {
        expect(fitInside(0, 0)).toBeNull();
        expect(fitInside(480, 0)).toBeNull();
        expect(fitInside(NaN, 360)).toBeNull();
    });
});
