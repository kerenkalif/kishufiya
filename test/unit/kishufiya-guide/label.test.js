// The label of a box to type in, as guide-at tells it to the page (targets.js inputLabel, frameOf).
//   npx jest test/unit/kishufiya-guide/label
import {frameOf, inputLabel, softFound, withLabel} from '../../../src/components/kishufiya-guide/targets.js';

const rect = (left, top, right, bottom) => ({left, top, right, bottom, width: right - left, height: bottom - top});
const words = (r, text = 'y') => ({textContent: text, contains: () => false, getBoundingClientRect: () => r});

describe('frameOf', () => {
    test('a DOMRect becomes left, top, width and height in whole pixels', () => {
        expect(frameOf(rect(10.4, 20.6, 50.4, 40.6))).toEqual({left: 10, top: 21, width: 40, height: 20});
        expect(frameOf(null)).toBe(null);
    });
});

describe('inputLabel', () => {
    test('a box inside a <label>: the span that is not the box', () => {
        const input = {tagName: 'INPUT'};
        const inside = {textContent: '', contains: el => el === input, getBoundingClientRect: () => rect(0, 0, 9, 9)};
        const label = {querySelectorAll: () => [inside, words(rect(5, 6, 25, 20))]};
        input.closest = sel => (sel === 'label' ? label : null);
        expect(inputLabel(input)).toEqual(rect(5, 6, 25, 20));
    });
    test('the prompt: the words in their own element above the box', () => {
        const input = {tagName: 'INPUT'};
        const body = {querySelector: () => words(rect(1, 2, 31, 12), 'Variable name')};
        input.closest = sel => (sel.includes('prompt_body_') ? body : null);
        expect(inputLabel(input)).toEqual(rect(1, 2, 31, 12));
    });
    test('no words, not a box, or words with no size: null', () => {
        const bare = {tagName: 'INPUT', closest: () => null};
        expect(inputLabel(bare)).toBe(null);
        expect(inputLabel({tagName: 'BUTTON'})).toBe(null);
        expect(inputLabel(null)).toBe(null);
        const flat = {tagName: 'INPUT', closest: sel => (sel === 'label' ? null : {querySelector: () => words(rect(0, 0, 0, 0))})};
        expect(inputLabel(flat)).toBe(null);
    });
});

describe('the soft mark of a box with words goes around both (Keren 25.11.2026)', () => {
    test('withLabel: the one rectangle around the box and its words', () => {
        expect(withLabel(rect(40, 10, 90, 30), rect(100, 12, 130, 28))).toEqual(rect(40, 10, 130, 30));
        expect(withLabel(rect(40, 10, 90, 30), null)).toBe(null);
        expect(withLabel(null, rect(0, 0, 5, 5))).toBe(null);
    });
    test('softFound: drawn around `named` when the target has it, and what is told (rect, label) is not changed', () => {
        const found = {rect: rect(40, 10, 90, 30), via: 'ui', label: rect(100, 12, 130, 28), named: rect(40, 10, 130, 30)};
        expect(softFound(found).rect).toEqual(found.named);
        expect(found.rect).toEqual(rect(40, 10, 90, 30));
        const bare = {rect: rect(1, 2, 3, 4), via: 'ui'};
        expect(softFound(bare)).toBe(bare);
    });
});
