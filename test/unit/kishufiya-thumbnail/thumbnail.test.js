// The picture of the stage a save sends for "המשחקים שלי" (lib/kishufiya-thumbnail.js): its PNG fits the platform's
// limit (KidsTeachingPlatform src/lib/limits.ts MAX_THUMBNAIL_BYTES) whatever the stage shows.
//   npx jest test/unit/kishufiya-thumbnail
import zlib from 'zlib';
import {
    PLATFORM_MAX_THUMBNAIL_BYTES,
    THUMBNAIL_HEIGHT,
    THUMBNAIL_WIDTH,
    fitInside,
    pngUpperBound,
    zlibBound
} from '../../../src/lib/kishufiya-thumbnail.js';

const W = THUMBNAIL_WIDTH;
const H = THUMBNAIL_HEIGHT;
const ROWS = H * (1 + (4 * W)); // what the PNG deflates: each row a filter byte and 4 bytes a pixel

// Bytes that do not compress, the same on every run (xorshift32): the worst a stage can give the encoder.
const noise = length => {
    const bytes = Buffer.alloc(length);
    let x = 2463534242;
    for (let i = 0; i < length; i++) {
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        bytes[i] = x & 255;
    }
    return bytes;
};

// The size of a PNG around a zlib stream, as libpng writes it: signature, IHDR, IDAT chunks of 8192 bytes, IEND.
const pngAround = zlibLength => 8 + 25 + zlibLength + (12 * Math.ceil(zlibLength / 8192)) + 12;

describe('the picture of the stage for "המשחקים שלי"', () => {
    test('is 4:3, as the stage and the card', () => {
        expect(W * 3).toBe(H * 4);
    });

    test("its PNG can never pass the platform's limit", () => {
        expect(pngUpperBound(W, H)).toBeLessThan(PLATFORM_MAX_THUMBNAIL_BYTES);
    });

    test('the bound holds for pixels that do not compress, at every zlib level and both strategies libpng uses', () => {
        const pixels = noise(ROWS);
        const {Z_DEFAULT_STRATEGY, Z_FILTERED} = zlib.constants;
        for (const strategy of [Z_DEFAULT_STRATEGY, Z_FILTERED]) {
            for (let level = 0; level <= 9; level++) {
                const stream = zlib.deflateSync(pixels, {level, strategy, windowBits: 15, memLevel: 8});
                expect(stream.length).toBeGreaterThan(ROWS); // nothing compressed: the worst case
                expect(stream.length).toBeLessThanOrEqual(zlibBound(ROWS));
                expect(pngAround(stream.length)).toBeLessThanOrEqual(pngUpperBound(W, H));
            }
        }
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
