// SPEC-editor-base 15.2: `editing` {sprite, thumb} - the sprite's small picture - and 15.1: the corner picture stands under the strip.
//   npx jest test/unit/kishufiya-guide/sprite-thumb
import {thumbBox, sayable, SPRITE_THUMB_PX, SPRITE_THUMB_MAX_CHARS} from '../../../src/components/kishufiya-guide/sprite-thumb.js';
import {setKeptTop, keptTopPx, watermarkTop} from '../../../src/lib/kishufiya-key-bar.js';

describe('sprite picture', () => {
    test('the costume is drawn inside the square, proportions kept, whole px', () => {
        expect(thumbBox(100, 50)).toEqual({width: SPRITE_THUMB_PX, height: SPRITE_THUMB_PX / 2});
        expect(thumbBox(30, 60)).toEqual({width: SPRITE_THUMB_PX / 2, height: SPRITE_THUMB_PX});
        expect(thumbBox(0, 0)).toEqual({width: SPRITE_THUMB_PX, height: SPRITE_THUMB_PX});
        expect(thumbBox(1000, 1)).toEqual({width: SPRITE_THUMB_PX, height: 1});
    });
    test('only a raster data URL within the limit is said (the same rule as the platform)', () => {
        const png = 'data:image/png;base64,iVBORw0KGgo=';
        expect(sayable(png)).toBe(png);
        expect(sayable('data:image/svg+xml;base64,PHN2Zz4=')).toBeNull();
        expect(sayable('https://example.com/a.png')).toBeNull();
        expect(sayable(`data:image/png;base64,${'A'.repeat(SPRITE_THUMB_MAX_CHARS)}`)).toBeNull();
        expect(sayable(null)).toBeNull();
    });
});

describe('the corner picture under the strip', () => {
    test('the picture stands lower by the room the base keeps, and where it always stood with none', () => {
        expect(watermarkTop(120, 100, 0)).toBe(20);
        expect(watermarkTop(120, 100, 136)).toBe(156);
        expect(watermarkTop(90, 100, 0)).toBe(0);
    });
    test('the kept top is whole px, never negative, and 0 gives it back', () => {
        setKeptTop(135.6);
        expect(keptTopPx()).toBe(136);
        setKeptTop(-5);
        expect(keptTopPx()).toBe(0);
        setKeptTop(NaN);
        expect(keptTopPx()).toBe(0);
    });
});
