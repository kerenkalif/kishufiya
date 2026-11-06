// Decision 65: the sprite info pane's fields are pointed at by the editor's own data-guide marks, and a folded or
// absent pane is told as 'pane-hidden', not as a plain missing target. A stand-in document, as in look-targets.
//   npx jest test/unit/kishufiya-guide/sprite-pane
import {resolve, isPaneField} from '../../../src/components/kishufiya-guide/targets.js';
import {fieldInPane, quietReports} from '../../../src/components/kishufiya-guide/detect.js';

const all = [];
const find = selector => selector.split(', ').map(part => {
    const g = /^\[data-guide="([^"]+)"\]$/.exec(part);
    if (g) return all.find(el => el.guide === g[1]) || null;
    const c = /^\[class\*="([^"]+)"\]$/.exec(part);
    return c ? all.find(el => el.className.includes(c[1])) || null : null;
}).find(Boolean) || null;
global.document = {querySelector: find, activeElement: null};

const rect = (top, bottom) => ({left: 0, right: 40, top, bottom, width: 40, height: bottom - top});
const el = (props, r) => all.push({className: '', children: [], getBoundingClientRect: () => r, ...props});

const FIELDS = ['sprite-name', 'sprite-x', 'sprite-y', 'sprite-size', 'sprite-direction', 'sprite-visible'];
// pane open: 100..200, fields inside it, each at its own height
const open = () => {
    all.length = 0;
    el({className: 'sprite-info_sprite-info_ab'}, rect(100, 200));
    FIELDS.forEach((name, i) => el({guide: name, tagName: 'INPUT', value: String(i)}, rect(110 + i * 10, 118 + i * 10)));
};
// folded by the sprite-properties addon: height 0, the inputs keep their rects
const folded = () => {
    open();
    all[0].getBoundingClientRect = () => rect(100, 100);
};

describe('sprite info pane', () => {
    test('every field resolves to its own box, none to a neighbour', () => {
        open();
        FIELDS.forEach((name, i) => {
            expect(resolve({ui: name}, null)).toMatchObject({via: 'ui', rect: {top: 110 + i * 10}});
        });
        expect(isPaneField('sprite-visible')).toBe(true);
        expect(isPaneField('green-flag')).toBe(false);
    });
    test('a number box tells its value', () => {
        open();
        expect(resolve({ui: 'sprite-size'}, null)).toMatchObject({value: '3', input: true});
    });
    test('the direction box does not need the dial popover: only its own mark', () => {
        open();
        expect(resolve({ui: 'sprite-direction'}, null).rect).toBeTruthy();
    });
    test('a folded pane: pane-hidden for every field and for the pane, though the inputs have rects', () => {
        folded();
        FIELDS.concat('sprite-info').forEach(name => {
            expect(resolve({ui: name}, null)).toEqual({missing: 'pane-hidden'});
        });
    });
    test('no pane on the screen: pane-hidden', () => {
        all.length = 0;
        expect(resolve({ui: 'sprite-x'}, null)).toEqual({missing: 'pane-hidden'});
        expect(resolve({ui: 'sprite-info'}, null)).toEqual({missing: 'pane-hidden'});
    });
    test('an open pane with the field itself gone is pane-hidden too (no mark to measure)', () => {
        open();
        all.splice(2, 1); // sprite-x gone
        expect(resolve({ui: 'sprite-x'}, null)).toEqual({missing: 'pane-hidden'});
    });
    test('other parts of the editor keep a plain missing', () => {
        all.length = 0;
        expect(resolve({ui: 'green-flag'}, null)).toEqual({missing: 'ui'});
    });
    test('fieldInPane', () => {
        expect(fieldInPane(rect(0, 10), rect(2, 8))).toBe(true);
        expect(fieldInPane(rect(0, 0), rect(2, 8))).toBe(false);
        expect(fieldInPane(rect(0, 10), rect(20, 28))).toBe(false);
        expect(fieldInPane(null, rect(0, 1))).toBe(false);
        expect(fieldInPane(rect(0, 10), null)).toBe(false);
    });
    test('a quiet guide tells it too', () => {
        expect(quietReports('pane-hidden')).toBe(true);
    });
});
