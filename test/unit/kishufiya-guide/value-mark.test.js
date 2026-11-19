// What goes in a ringed field, drawn from the base's signs (platform decision 0055): the value to type in a tag by the field, the
// choice to pick ringed in the field's open menu. The editor decides neither: it reads `target.signs`.
//   npx jest test/unit/kishufiya-guide/value-mark
import fs from 'fs';
import path from 'path';
import {valueTagOf, tagPlace, TAG_GAP, choiceOf, choiceIndex, openMenuItems, MENU_ITEM} from
    '../../../src/components/kishufiya-guide/value-mark.js';

const rect = (left, top, right, bottom) => ({left, top, right, bottom, width: right - left, height: bottom - top});
const view = {width: 1200, height: 800};
const size = {width: 50, height: 44};

describe('valueTagOf', () => {
    test('the value of a guide that asks to type one', () => {
        expect(valueTagOf({act: 'type', value: '10'})).toBe('10');
        expect(valueTagOf({act: 'type', value: '-240'})).toBe('-240');
        expect(valueTagOf({act: 'type', value: 'חיים'})).toBe('חיים');
    });
    test('words of the child own, a choice, a key, a drag and no signs at all: no tag', () => {
        expect(valueTagOf({act: 'type'})).toBe(null);
        expect(valueTagOf({act: 'type', value: ''})).toBe(null);
        expect(valueTagOf({act: 'pick', choice: {label: 'חץ ימינה', raw: 'right arrow'}})).toBe(null);
        expect(valueTagOf({act: 'press', value: 'space'})).toBe(null);
        expect(valueTagOf({act: 'drag', ghost: true})).toBe(null);
        expect(valueTagOf(null)).toBe(null);
        expect(valueTagOf()).toBe(null);
    });
});

describe('tagPlace', () => {
    test('over the field, centred, never on it', () => {
        const field = rect(400, 300, 440, 330);
        const at = tagPlace(field, size, view);
        expect(at).toEqual({left: 395, top: 300 - TAG_GAP - 44, right: 445, bottom: 300 - TAG_GAP});
        expect(at.bottom).toBeLessThanOrEqual(field.top);
    });
    test('no room over it: under it', () => {
        const field = rect(400, 20, 440, 50);
        expect(tagPlace(field, size, view).top).toBe(50 + TAG_GAP);
    });
    test('a box with its own words over it: under the box, and over it only at the bottom of the window', () => {
        const box = rect(400, 300, 460, 330);
        expect(tagPlace(box, size, view, true).top).toBe(330 + TAG_GAP);
        const low = rect(400, 760, 460, 790);
        expect(tagPlace(low, size, view, true).top).toBe(760 - TAG_GAP - 44);
    });
    test('held inside the window', () => {
        expect(tagPlace(rect(0, 300, 20, 330), size, view).left).toBe(0);
        expect(tagPlace(rect(1190, 300, 1200, 330), size, view).left).toBe(1150);
        const at = tagPlace(rect(400, 5, 440, 795), size, view);
        expect(at.top).toBeGreaterThanOrEqual(0);
        expect(at.bottom).toBeLessThanOrEqual(view.height);
    });
});

describe('the choice of a menu', () => {
    test('only a pick with a label has one', () => {
        expect(choiceOf({act: 'pick', choice: {label: 'חֵץ יָמִינָה', raw: 'right arrow'}})).toBe('חֵץ יָמִינָה');
        expect(choiceOf({act: 'pick'})).toBe(null);
        expect(choiceOf({act: 'type', value: '10'})).toBe(null);
        expect(choiceOf(null)).toBe(null);
    });
    test('found by the text the menu shows, with its niqqud', () => {
        const menu = ['רווח', 'חֵץ לְמַעְלָה', 'חֵץ יָמִינָה', 'a'];
        expect(choiceIndex(menu, 'חֵץ יָמִינָה')).toBe(2);
        expect(choiceIndex(menu, ' רווח ')).toBe(0);
    });
    test('a menu drawn plain, or a label sent plain: found without the niqqud', () => {
        expect(choiceIndex(['חץ למעלה', 'חץ ימינה'], 'חֵץ יָמִינָה')).toBe(1);
        expect(choiceIndex(['חֵץ לְמַעְלָה', 'חֵץ יָמִינָה'], 'חץ ימינה')).toBe(1);
    });
    test('the exact text wins over a plain look-alike before it', () => {
        expect(choiceIndex(['אדם', 'אָדֹם'], 'אָדֹם')).toBe(1);
    });
    test('another field has its menu open: nothing is ringed', () => {
        expect(choiceIndex(['1', '2', '3'], 'חֵץ יָמִינָה')).toBe(-1);
        expect(choiceIndex([], 'x')).toBe(-1);
        expect(choiceIndex(['', ' '], '')).toBe(-1);
        expect(choiceIndex(['a'], null)).toBe(-1);
    });
});

describe('openMenuItems', () => {
    const item = (text, r, content = true) => ({
        textContent: `✓${text}`,
        querySelector: () => (content ? {textContent: text} : null),
        getBoundingClientRect: () => r
    });
    test('the rows of the open menu with the text each shows; a row with no size is not there', () => {
        const rows = [item('רווח', rect(0, 0, 80, 20)), item('a', rect(0, 20, 80, 40)), item('hidden', rect(0, 0, 0, 0))];
        const doc = {querySelectorAll: selector => (selector === MENU_ITEM ? rows : [])};
        expect(openMenuItems(doc).map(one => one.text)).toEqual(['רווח', 'a']);
        expect(openMenuItems({querySelectorAll: () => []})).toEqual([]);
    });
    test('a row with no content element: its own text', () => {
        const doc = {querySelectorAll: () => [item('x', rect(0, 0, 80, 20), false)]};
        expect(openMenuItems(doc)[0].text).toBe('✓x');
    });
});

describe('the guide draws from the signs and decides nothing', () => {
    const guide = fs.readFileSync(path.join(__dirname, '../../../src/components/kishufiya-guide/guide.js'), 'utf8');
    test('guide.js asks value-mark.js for the tag and the choice', () => {
        for (const name of ['valueTagOf', 'tagPlace', 'choiceOf', 'choiceIndex', 'openMenuItems']) {
            expect(guide).toContain(`${name}(`);
        }
        expect(guide).toContain('state.guide.target.signs');
    });
});
