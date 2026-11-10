// The automatic stage size: small on a low or narrow window, with hysteresis.
//   npx jest test/unit/kishufiya-guide/stage-auto
import {autoStage, choiceWidth, encodeChoice, parseChoice} from '../../../src/lib/kishufiya-stage-auto.js';

describe('autoStage', () => {
    test('a roomy window gets the large stage', () => {
        expect(autoStage({width: 1440, height: 900, current: 'large'})).toBe('large');
    });
    test('a low window goes small', () => {
        expect(autoStage({width: 1280, height: 650, current: 'large'})).toBe('small');
    });
    test('a narrow window goes small', () => {
        expect(autoStage({width: 990, height: 900, current: 'large'})).toBe('small');
    });
    test('hysteresis: small stays small until 40px beyond the line', () => {
        expect(autoStage({width: 1280, height: 700, current: 'small'})).toBe('small');
        expect(autoStage({width: 1280, height: 720, current: 'small'})).toBe('large');
        expect(autoStage({width: 1030, height: 900, current: 'small'})).toBe('small');
        expect(autoStage({width: 1040, height: 900, current: 'small'})).toBe('large');
    });
    test('large does not flip at the line itself', () => {
        expect(autoStage({width: 1280, height: 680, current: 'large'})).toBe('large');
        expect(autoStage({width: 1280, height: 679, current: 'large'})).toBe('small');
    });
});

describe('the choice of the child, per kind of window', () => {
    test('holds in the kind of window it was made in, with the dragged width itself', () => {
        const choice = parseChoice(encodeChoice('small', 300));
        expect(choiceWidth(choice, 'small')).toBe(300);
    });
    test('is void in the other kind of window', () => {
        const choice = parseChoice(encodeChoice('large', 480));
        expect(choiceWidth(choice, 'small')).toBeNull();
    });
    test('nothing, or damaged text, is no choice', () => {
        expect(choiceWidth(null, 'large')).toBeNull();
        expect(parseChoice('large')).toBeNull();
        expect(parseChoice('{"bucket":"x","width":3}')).toBeNull();
        expect(parseChoice(null)).toBeNull();
    });
});
