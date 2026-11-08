// The guide draws a whole script's ring alone (platform point-help, 2026-11-08): no arrow, no words, never the louder ring; the
// ring follows the script as the code scrolls and zooms, and goes with guide-clear like any ring - while a block's ring keeps its
// arrow. guide.js itself, with a stand-in document, workspace and VM (Node has no DOM and jsdom is not a dependency) and jest's
// fake timers for its frame loop.
//   npx jest test/unit/kishufiya-guide/script-ring-draw
import {attachGuide, handleGuide} from '../../../src/components/kishufiya-guide/guide.js';

// the CSS module's class names as themselves, to find the guide's parts by them
jest.mock('../../../src/components/kishufiya-guide/guide.css', () => ({
    layer: 'layer', veil: 'veil', note: 'note', ring: 'ring', flash: 'flash', bubble: 'bubble', text: 'text', arrow: 'arrow',
    pointer: 'pointer', ghost: 'ghost', louder: 'louder', soft: 'soft', point: 'point', flashing: 'flashing',
    picking: 'picking', frozen: 'frozen'
}));

// ---- a stand-in document: the elements the guide makes, their classes and styles ----
const made = [];
const element = () => {
    const classes = new Set();
    const attributes = new Map();
    const el = {
        style: {},
        children: [],
        textContent: '',
        offsetWidth: 0,
        offsetHeight: 0,
        classList: {
            add: name => classes.add(name),
            remove: name => classes.delete(name),
            contains: name => classes.has(name),
            toggle: (name, on) => {
                const want = typeof on === 'undefined' ? !classes.has(name) : Boolean(on);
                if (want) classes.add(name);
                else classes.delete(name);
                return want;
            }
        },
        setAttribute: (name, value) => attributes.set(name, String(value)),
        getAttribute: name => (attributes.has(name) ? attributes.get(name) : null),
        removeAttribute: name => attributes.delete(name),
        hasAttribute: name => attributes.has(name),
        appendChild: child => {
            el.children.push(child);
            return child;
        }
    };
    Object.defineProperty(el, 'className', {
        get: () => [...classes].join(' '),
        set: value => {
            classes.clear();
            String(value).split(' ')
                .filter(Boolean)
                .forEach(name => classes.add(name));
        }
    });
    Object.defineProperty(el, 'lastChild', {get: () => el.children[el.children.length - 1]});
    made.push(el);
    return el;
};
const part = name => made.find(el => el.className.split(' ')[0] === name);
const showing = name => part(name).style.display === 'block';
const ringBox = () => {
    const ring = part('ring');
    if (ring.style.display !== 'block') return null;
    const px = value => parseInt(value, 10);
    return {left: px(ring.style.left), top: px(ring.style.top), width: px(ring.style.width), height: px(ring.style.height)};
};

// ---- a stand-in workspace: one script (a hat, a "turn", a "say"), drawn where the code is scrolled (dy) and zoomed (zoom) ----
let dy = 0;
let zoom = 1;
let drawn = true; // false: out of the code area's view, scratch-blocks does not draw it
const at = (left, top, right, bottom) => () => {
    if (!drawn) return {left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0};
    const r = {left: left * zoom, top: (top + dy) * zoom, right: right * zoom, bottom: (bottom + dy) * zoom};
    return {...r, width: r.right - r.left, height: r.bottom - r.top};
};
const blocks = {};
const block = (id, row, group) => {
    blocks[id] = {
        id,
        isShadow: () => false,
        svgPath_: {getBoundingClientRect: row},
        getSvgRoot: () => ({getBoundingClientRect: group}),
        getRootBlock: () => blocks.hat
    };
};
block('hat', at(300, 100, 460, 140), at(300, 100, 560, 292));
block('turn', at(316, 172, 560, 212), at(316, 172, 560, 212));
block('say', at(300, 252, 420, 292), at(300, 252, 420, 292));
// a script of any size and place, for the cut to the code area (null: the one drawn above)
let scriptAt = null;
const drawnScript = blocks.hat.getSvgRoot;
blocks.hat.getSvgRoot = () => (scriptAt ? {getBoundingClientRect: () => scriptAt} : drawnScript());
const rect = (left, top, right, bottom) => ({left, top, right, bottom, width: right - left, height: bottom - top});
const centred = [];
let onCentre = () => {};
const ws = {
    RTL: true,
    scale: 0.675,
    getBlockById: id => blocks[id] || null,
    getParentSvg: () => ({getBoundingClientRect: () => ({left: 0, top: 0, right: 900, bottom: 700, width: 900, height: 700})}),
    getFlyout: () => null,
    getToolbox: () => null,
    centerOnBlock: id => {
        centred.push(id);
        onCentre();
    }
};
const vm = {
    editingTarget: {getName: () => 'Cat'},
    on: () => {},
    runtime: {on: () => {}, startHats: () => [], ioDevices: {}, getTargetForStage: () => null}
};
const told = [];
const lastAt = () => told.filter(msg => msg.type === 'guide-at').pop();
const SCRIPT = {blockId: 'turn', in: 'code', sprite: 'Cat', script: true};

beforeAll(() => {
    jest.useFakeTimers();
    // the guide's frame loop, on the fake clock
    global.requestAnimationFrame = callback => setTimeout(() => callback(Date.now()), 16);
    global.MutationObserver = class {
        observe () {}
    };
    global.window = {innerWidth: 1280, innerHeight: 720, addEventListener: () => {}, ScratchBlocks: {getMainWorkspace: () => ws}};
    global.document = {
        body: element(),
        createElement: () => element(),
        querySelector: () => null,
        querySelectorAll: () => [],
        activeElement: null
    };
    attachGuide(vm, msg => told.push(msg));
});

afterAll(() => {
    handleGuide({type: 'guide-clear'});
    jest.advanceTimersByTime(200);
    jest.useRealTimers();
});

beforeEach(() => {
    dy = 0;
    zoom = 1;
    drawn = true;
    scriptAt = null;
    centred.length = 0;
    onCentre = () => {};
});

describe('the ring around a whole script', () => {
    test('around all of the script, with no arrow and no words - even when words are sent', () => {
        handleGuide({type: 'guide', id: 1, target: SCRIPT, text: 'words for a bubble'});
        jest.advanceTimersByTime(50);
        // the script's box, 4px out on every side as a block's ring is
        expect(ringBox()).toEqual({left: 296, top: 96, width: 268, height: 200});
        expect(part('ring').getAttribute('data-open')).toBeNull(); // all of it in view: nothing cut
        expect(showing('pointer')).toBe(false);
        expect(showing('bubble')).toBe(false);
        expect(lastAt()).toMatchObject({
            id: 1,
            rect: {left: 300, top: 100, width: 260, height: 192},
            via: 'script',
            arrow: null,
            clear: {left: 300, top: 100, width: 260, height: 192}
        });
    });
    test('not pressed for long: still no arrow, and never the louder ring', () => {
        jest.advanceTimersByTime(12000);
        expect(part('ring').classList.contains('louder')).toBe(false);
        expect(showing('pointer')).toBe(false);
        expect(ringBox()).toEqual({left: 296, top: 96, width: 268, height: 200});
    });
    test('it follows the script as the code scrolls and zooms', () => {
        dy = -40;
        jest.advanceTimersByTime(150);
        expect(ringBox()).toEqual({left: 296, top: 56, width: 268, height: 200});
        expect(lastAt().rect).toEqual({left: 300, top: 60, width: 260, height: 192});
        dy = 0;
        zoom = 0.5;
        jest.advanceTimersByTime(150);
        expect(ringBox()).toEqual({left: 146, top: 46, width: 138, height: 104});
        expect(lastAt().rect).toEqual({left: 150, top: 50, width: 130, height: 96});
        expect(centred).toEqual([]); // in view all along: nothing scrolled
    });
    test('guide-clear takes it away, as any ring', () => {
        handleGuide({type: 'guide-clear'});
        jest.advanceTimersByTime(50);
        expect(part('ring').style.display).toBe('none');
        expect(lastAt().rect).toBeNull();
    });
});

describe('a block\'s ring is as before', () => {
    test('a block of the same script without script: true - its own row, and the arrow beside the script', () => {
        handleGuide({type: 'guide', id: 2, target: {blockId: 'turn', in: 'code', sprite: 'Cat'}});
        jest.advanceTimersByTime(50);
        expect(ringBox()).toEqual({left: 312, top: 168, width: 252, height: 48});
        expect(showing('pointer')).toBe(true);
        expect(lastAt()).toMatchObject({id: 2, via: 'block', arrow: 'left'});
        // not pressed for a while: a ring to press does get louder
        jest.advanceTimersByTime(5000);
        expect(part('ring').classList.contains('louder')).toBe(true);
    });
    test('...and a script after it: the arrow and the louder ring are gone at once', () => {
        handleGuide({type: 'guide', id: 3, target: SCRIPT});
        jest.advanceTimersByTime(50);
        expect(showing('pointer')).toBe(false);
        expect(part('ring').classList.contains('louder')).toBe(false);
        expect(ringBox()).toEqual({left: 296, top: 96, width: 268, height: 200});
        expect(lastAt()).toMatchObject({id: 3, via: 'script', arrow: null});
    });
});

describe('a script out of the code area\'s view: the code scrolls as for a block', () => {
    test('not drawn: the code scrolls to its top block once, then it is ringed', () => {
        drawn = false;
        onCentre = () => {
            drawn = true;
        };
        handleGuide({type: 'guide', id: 4, target: SCRIPT});
        jest.advanceTimersByTime(50);
        expect(centred).toEqual(['hat']);
        expect(part('ring').style.display).toBe('none');
        jest.advanceTimersByTime(150);
        expect(ringBox()).toEqual({left: 296, top: 96, width: 268, height: 200});
        expect(showing('pointer')).toBe(false);
    });
});

// the code area is 0..900 across and 0..700 down (the stand-in workspace's SVG, no palette beside it)
describe('cut to the code area: never over the tabs, the palette or off the screen', () => {
    test('taller than the view: scrolled to once, then ringed where it is seen - open at the top and the bottom', () => {
        scriptAt = rect(300, -200, 560, 1000);
        handleGuide({type: 'guide', id: 5, target: SCRIPT});
        jest.advanceTimersByTime(50);
        expect(centred).toEqual(['hat']);
        jest.advanceTimersByTime(1000);
        expect(centred).toEqual(['hat']); // once only, as for a block
        expect(ringBox()).toEqual({left: 296, top: 0, width: 268, height: 700});
        expect(part('ring').getAttribute('data-open')).toBe('top bottom');
        expect(showing('pointer')).toBe(false);
        // told: the part seen; its whole script's box stays the `clear` to keep off
        expect(lastAt()).toMatchObject({
            id: 5,
            rect: {left: 300, top: 0, width: 260, height: 700},
            via: 'script',
            arrow: null,
            clear: {left: 300, top: -200, width: 260, height: 1200}
        });
    });
    test('going on past the bottom only: open there alone', () => {
        scriptAt = rect(300, 500, 560, 900);
        handleGuide({type: 'guide', id: 6, target: SCRIPT});
        jest.advanceTimersByTime(250);
        expect(ringBox()).toEqual({left: 296, top: 496, width: 268, height: 204});
        expect(part('ring').getAttribute('data-open')).toBe('bottom');
        expect(lastAt().rect).toEqual({left: 300, top: 500, width: 260, height: 200});
    });
    test('going on under the palette\'s side: cut at the code area\'s edge, open there', () => {
        scriptAt = rect(700, 100, 1000, 300);
        handleGuide({type: 'guide', id: 7, target: SCRIPT});
        jest.advanceTimersByTime(250);
        expect(ringBox()).toEqual({left: 696, top: 96, width: 204, height: 208});
        expect(part('ring').getAttribute('data-open')).toBe('right');
    });
    test('only its 4px past the edge: the ring stops at the edge, closed - the script ends in view, no scroll', () => {
        scriptAt = rect(300, 2, 560, 200);
        handleGuide({type: 'guide', id: 8, target: SCRIPT});
        jest.advanceTimersByTime(250);
        expect(centred).toEqual([]);
        expect(ringBox()).toEqual({left: 296, top: 0, width: 268, height: 204});
        expect(part('ring').getAttribute('data-open')).toBeNull();
    });
    test('nothing of it in the code area after the scroll: no ring, and told missing as out of view', () => {
        scriptAt = rect(950, 100, 1100, 300);
        handleGuide({type: 'guide', id: 9, target: SCRIPT});
        jest.advanceTimersByTime(900);
        expect(centred).toEqual(['hat']);
        expect(part('ring').style.display).toBe('none');
        expect(lastAt().rect).toBeNull();
        expect(told.filter(msg => msg.type === 'guide-missing' && msg.id === 9)).toEqual([
            {type: 'guide-missing', id: 9, target: SCRIPT, reason: 'offscreen', by: null}
        ]);
    });
    test('a block\'s ring after a cut script: no open side left on it', () => {
        scriptAt = rect(300, -200, 560, 1000);
        handleGuide({type: 'guide', id: 10, target: SCRIPT});
        jest.advanceTimersByTime(250);
        expect(part('ring').getAttribute('data-open')).toBe('top bottom');
        handleGuide({type: 'guide', id: 11, target: {blockId: 'turn', in: 'code', sprite: 'Cat'}});
        jest.advanceTimersByTime(50);
        expect(part('ring').getAttribute('data-open')).toBeNull();
        expect(ringBox()).toEqual({left: 312, top: 168, width: 252, height: 48});
        expect(showing('pointer')).toBe(true);
        handleGuide({type: 'guide-clear'});
        jest.advanceTimersByTime(50);
        expect(part('ring').getAttribute('data-open')).toBeNull();
    });
});
