// Keren 2026-11-28: a negative number reads "-100" in the right-to-left editor, not "100-".
//   npx jest test/unit/kishufiya-ltr-numbers
import fs from 'fs';
import path from 'path';
import {isolateSignedNumbers, fixFieldDisplay} from '../../../src/lib/kishufiya-ltr-numbers.js';

const LRE = '‪';
const RLE = '‫';
const PDF = '‬';
const LRI = '⁦';
const PDI = '⁩';

const SRC = path.join(__dirname, '..', '..', '..', 'src');

describe('fixFieldDisplay', () => {
    test('a number in a block that scratch-blocks embeds right to left is embedded left to right', () => {
        for (const n of ['-100', '5', '-0.5', '−3', '1e-5', '+2']) {
            expect(fixFieldDisplay(`${RLE}${n}${PDF}`)).toBe(`${LRE}${n}${PDF}`);
        }
    });
    test('a number already left to right stays', () => {
        expect(fixFieldDisplay(`${LRE}-100${PDF}`)).toBe(`${LRE}-100${PDF}`);
    });
    test('text with words stays right to left, its signed number isolated', () => {
        expect(fixFieldDisplay(`${RLE}ניקוד -5${PDF}`)).toBe(`${RLE}ניקוד ${LRI}-5${PDI}${PDF}`);
        expect(fixFieldDisplay(`${RLE}שלום${PDF}`)).toBe(`${RLE}שלום${PDF}`);
    });
    test('text with no embedding (a left to right block) is not touched', () => {
        expect(fixFieldDisplay('-100')).toBe('-100');
        expect(fixFieldDisplay('')).toBe('');
    });
});

describe('isolateSignedNumbers', () => {
    test('a signed number is isolated, other text is not', () => {
        expect(isolateSignedNumbers('-196')).toBe(`${LRI}-196${PDI}`);
        expect(isolateSignedNumbers('x הוא -3.5 צעדים')).toBe(`x הוא ${LRI}-3.5${PDI} צעדים`);
        expect(isolateSignedNumbers('10-5')).toBe('10-5');
        expect(isolateSignedNumbers('שלום 42')).toBe('שלום 42');
    });
});

describe('the GUI layer', () => {
    test('number inputs and the block field box get plaintext direction, in one place', () => {
        const css = fs.readFileSync(path.join(SRC, 'css', 'ltr-numbers.css'), 'utf8');
        expect(css).toMatch(/input\[type="number"\][\s\S]*unicode-bidi: plaintext/);
        expect(css).toMatch(/blocklyHtmlInput/);
    });
    test('every monitor readout composes the shared class', () => {
        const monitor = fs.readFileSync(path.join(SRC, 'components', 'monitor', 'monitor.css'), 'utf8');
        for (const cls of ['value', 'large-value', 'list-value', 'value-inner', 'list-input']) {
            expect(monitor).toMatch(new RegExp(`\\.${cls} \\{\\s*composes: ltr-numbers`));
        }
    });
});
