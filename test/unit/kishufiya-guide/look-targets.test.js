// Node has no DOM and jsdom is not a dependency: a stand-in document that knows the two selector shapes UI uses,
// '[class*="x"]' and '[class*="x"] > li:nth-child(n)', is enough to resolve a target.
//   npx jest test/unit/kishufiya-guide/look-targets
import {resolve} from '../../../src/components/kishufiya-guide/targets.js';

const all = [];
const matches = (el, part) => {
    const m = /^\[class\*="([^"]+)"\]$/.exec(part);
    return Boolean(m) && el.className.includes(m[1]);
};
const find = selector => {
    const [first, rest] = selector.split(' > ');
    const parents = all.filter(el => matches(el, first));
    if (!rest) return parents[0] || null;
    const n = Number(/nth-child\((\d)\)/.exec(rest)[1]);
    return parents.length ? parents[0].children[n - 1] || null : null;
};
global.document = {
    querySelector: selector => selector.split(', ').map(find)
        .find(Boolean) || null,
    activeElement: null
};

const box = (parent, className, height) => {
    const el = {className, children: [], getBoundingClientRect: () => ({left: 0, right: 50, top: 0, bottom: height, width: 50, height})};
    if (parent) parent.children.push(el);
    all.push(el);
    return el;
};

// heights: code tab 10, costumes tab 11, sounds tab 12, the asset list 300, the sprite list 400
const editor = selectedTab => {
    all.length = 0;
    const tabs = box(null, 'gui_tab-list_ab12', 99);
    ['code', 'costumes', 'sounds'].forEach((name, i) => {
        box(tabs, name === selectedTab ? 'react-tabs_tab is-selected' : 'react-tabs_tab', 10 + i);
    });
    box(null, 'selector_list-area_cd34', 300);
    box(null, 'sprite-selector_items-wrapper_ef56', 400);
};

describe('look targets', () => {
    test('the costume list with the costumes tab open: the whole list', () => {
        editor('costumes');
        expect(resolve({ui: 'costume-list'}, null)).toMatchObject({via: 'ui', rect: {height: 300}});
    });
    test('the costume list while the code or sounds tab is open: the costumes tab first', () => {
        editor('code');
        expect(resolve({ui: 'costume-list'}, null)).toMatchObject({via: 'ui', rect: {height: 11}});
        editor('sounds');
        expect(resolve({ui: 'costume-list'}, null)).toMatchObject({via: 'ui', rect: {height: 11}});
    });
    test('the sound list: the list when the sounds tab is open, its tab otherwise', () => {
        editor('sounds');
        expect(resolve({ui: 'sound-list'}, null)).toMatchObject({via: 'ui', rect: {height: 300}});
        editor('costumes');
        expect(resolve({ui: 'sound-list'}, null)).toMatchObject({via: 'ui', rect: {height: 12}});
    });
    test('the sprite list is there on any tab; a list that is not on the screen is missing', () => {
        editor('code');
        expect(resolve({ui: 'sprite-list'}, null)).toMatchObject({via: 'ui', rect: {height: 400}});
        editor('costumes');
        expect(resolve({ui: 'sprite-list'}, null)).toMatchObject({rect: {height: 400}});
        all.length = 0;
        expect(resolve({ui: 'sprite-list'}, null)).toEqual({missing: 'ui'});
    });
});
