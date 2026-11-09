// כישופייה: the picture of the stage that a save sends along with the game, for its card in "המשחקים שלי" (the
// 'saved' message, playground/kishufiya.jsx). The platform keeps a PNG of up to MAX_THUMBNAIL_BYTES and refuses a
// bigger one (413), silently: the card shows no picture. The renderer's own snapshot is the stage canvas at its size
// on screen times the screen's pixel ratio - 480x360 as the editor opens, up to 720x540 dragged larger, more at full
// screen or on a sharper screen - and over a detailed backdrop its PNG was past the limit on every save
// (donuts-war-in-space, 2026-11-09). So the picture is drawn at one size whose PNG cannot pass the limit, whatever
// the stage shows, and a PNG past it all the same (an encoder unlike libpng) is not sent.
//
// The editor's other pictures of the stage are the renderer's own at its own size and never reach the platform's
// store: the guide's 'snapshot' (components/kishufiya-guide/guide.js), which the lesson shows on its finish screen,
// and a restore point's (lib/tw-restore-point-api.js), kept in the browser. A picture the platform keeps is made here.

// KidsTeachingPlatform src/lib/limits.ts MAX_THUMBNAIL_BYTES: change the two together.
export const PLATFORM_MAX_THUMBNAIL_BYTES = 300000;

// 4:3, as the stage and the card. 320x240 is past the limit by its pixels alone (240 rows of 1 + 4 * 320 bytes).
export const THUMBNAIL_WIDTH = 300;
export const THUMBNAIL_HEIGHT = 225;

// What a PNG holds besides its pixels, in bytes (pngUpperBound).
const SIGNATURE = 8;
const CHUNK = 12; // around every chunk's data: its length, type and CRC
const IHDR = CHUNK + 13;
const IEND = CHUNK;
const IDAT_DATA = 8192; // libpng cuts the zlib stream into IDAT chunks of this much; larger chunks cost less
// Room for what an encoder adds: sRGB, sBIT, gAMA, pHYs, an ICC profile. The test builds a PNG without them.
export const OTHER_CHUNKS = 4096;

// The most a zlib stream of n bytes can take at the settings libpng gives zlib (windowBits 15, memLevel 8), whatever
// the level and strategy: zlib's own bound (deflateBound, zlib.h). Bytes that do not compress are stored as they
// are, 5 bytes more for each block of 16KB; the 13 hold the stream's header and checksum too.
export const zlibBound = n => n + (n >>> 12) + (n >>> 14) + (n >>> 25) + 13;

// The most bytes a canvas's PNG of width x height can take, whatever its pixels. A canvas is 8-bit RGBA, so the
// image is height rows of a filter byte and 4 bytes a pixel, deflated by zlib (libpng: the encoder of Chrome and
// Firefox).
export const pngUpperBound = (width, height) => {
    const zlib = zlibBound(height * (1 + (4 * width)));
    const idat = zlib + (CHUNK * Math.ceil(zlib / IDAT_DATA));
    return SIGNATURE + IHDR + idat + IEND + OTHER_CHUNKS;
};

// Where a picture of width x height goes in a box (the thumbnail), whole and in its own shape: as large as fits, in
// the middle, on transparent bars that show the card's own background, as its object-fit: contain does. The stage's
// 4:3 fills the box. Whole pixels keep the edges sharp, and a side a pixel short of the box is a canvas rounded to
// whole pixels (at some pixel ratio), not another shape: it fills the box too. Null for a picture with no size.
export const fitInside = (width, height, boxWidth = THUMBNAIL_WIDTH, boxHeight = THUMBNAIL_HEIGHT) => {
    if (!(width > 0 && height > 0)) return null;
    const scale = Math.min(boxWidth / width, boxHeight / height);
    const side = (size, box) => {
        const scaled = Math.round(size * scale);
        return box - scaled <= 1 ? box : scaled;
    };
    const fitWidth = side(width, boxWidth);
    const fitHeight = side(height, boxHeight);
    return {
        x: Math.floor((boxWidth - fitWidth) / 2),
        y: Math.floor((boxHeight - fitHeight) / 2),
        width: fitWidth,
        height: fitHeight
    };
};
