// Kishufiya (2026-10-27): block-render.html, a page that only draws blocks (lib/kishufiya-block-render.js),
// for the platform's pages that show a block with the values a text gives. It loads scratch-blocks alone -
// the same "sb" chunk the editor loads, so it is cached for a child who has the editor open - in Hebrew,
// right to left, with the editor's own block definitions and words (lib/blocks.js) and the light theme.
//
// The platform opens it in a hidden iframe and asks by postMessage, same origin only:
//   → {type: 'kishufiya-render-block', id, xml, values, defs}   defs: extension blocks' JSON (pen), optional
//   ← {type: 'kishufiya-rendered-block', id, svg, width, height} or {..., id, error}
// and it says {type: 'kishufiya-block-render-ready'} to its parent once it can draw. A script that drives it
// in a browser calls window.kishufiyaRenderBlock(xml, values, defs) instead.

import LazyScratchBlocks from '../lib/tw-lazy-scratch-blocks';
import VMScratchBlocks from '../lib/blocks';
import {Theme} from '../lib/themes';
import {renderBlock} from '../lib/kishufiya-block-render';

// What lib/blocks.js asks the VM for, to fill the menus of costumes, sounds, backdrops and sprites: the names
// in the request, so a menu shows the name it was given. "[ ▾] של [ ▾]" asks for the block in the palette:
// one whose menu names the object the request asks about, so its first menu offers that one's properties.
const names = new Set();
const named = () => [...names].map(name => ({name}));
const OF_MENU = 'kishufiya-of-menu';
let ofObject = '_stage_'; // the object "[ ▾] של [ ▾]" asks about: the stage's properties, or a sprite's
const nobody = {_blocks: {}, getBlock: () => null};
const palette = {
    _blocks: {sensing_of: {opcode: 'sensing_of', inputs: {OBJECT: {shadow: OF_MENU, block: OF_MENU}}}},
    getBlock: id => (id === OF_MENU ? {fields: {OBJECT: {value: ofObject}}} : null)
};
const sprite = {
    isStage: false,
    blocks: nobody,
    isOriginal: true,
    sprite: {
        name: '',
        get sounds () {
            return named();
        }
    },
    getCostumes: named
};
const stage = {
    isStage: true,
    blocks: nobody,
    isOriginal: true,
    sprite: {name: '', sounds: []},
    getCostumes: named,
    getAllVariableNamesInScopeByType: () => []
};
const vm = {
    editingTarget: sprite,
    runtime: {
        targets: [stage, sprite],
        getTargetForStage: () => stage,
        getSpriteTargetByName: () => null,
        flyoutBlocks: palette,
        monitorBlocks: nobody,
        emit: () => {}
    },
    getPeripheralIsConnected: () => false
};

const ready = LazyScratchBlocks.load().then(() => {
    const ScratchBlocks = VMScratchBlocks(vm);
    ScratchBlocks.ScratchMsgs.setLocale('he');
    const host = document.createElement('div');
    // drawn, so getBBox and the computed styles work, but never seen - off the page, not "visibility: hidden",
    // which every element inherits and the drawing would copy
    host.style.cssText = 'position:absolute;left:-10000px;top:0;width:1200px;height:800px;pointer-events:none';
    document.body.appendChild(host);
    const colours = Theme.light.getBlockColors();
    const workspace = ScratchBlocks.inject(host, {
        rtl: true,
        media: `${process.env.ROOT}static/${Theme.light.getBlocksMediaFolder()}/`,
        colours,
        zoom: {startScale: 1},
        comments: false,
        sounds: false
    });
    return {ScratchBlocks, workspace};
});

const defined = new Set();
const render = async (xml, values, defs) => {
    const {ScratchBlocks, workspace} = await ready;
    const fresh = (defs || [])
        .filter(def => def && def.type && !defined.has(def.type) && !ScratchBlocks.Blocks[def.type]);
    if (fresh.length) {
        ScratchBlocks.defineBlocksWithJsonArray(fresh);
        for (const def of fresh) defined.add(def.type);
    }
    names.clear();
    for (const value of Object.values(values || {})) if (typeof value === 'string' && value) names.add(value);
    for (const m of String(xml).matchAll(/<field[^>]*>([^<]*)<\/field>/g)) if (m[1]) names.add(m[1]);
    const object = /<field name="OBJECT"[^>]*>([^<]*)<\/field>/.exec(String(xml));
    ofObject = (values && values.OBJECT) || (object && object[1]) || '_stage_';
    return renderBlock(ScratchBlocks, workspace, xml, values);
};

// One drawing at a time: they share one workspace, and a drawing waits for its images.
let queue = Promise.resolve();
const renderInTurn = (xml, values, defs) => {
    const next = queue.then(() => render(xml, values, defs));
    queue = next.catch(() => null);
    return next;
};

window.kishufiyaRenderBlock = renderInTurn;

window.addEventListener('message', async event => {
    if (event.origin !== location.origin) return;
    const data = event.data || {};
    if (data.type !== 'kishufiya-render-block') return;
    let reply;
    try {
        const out = await renderInTurn(data.xml, data.values, data.defs);
        reply = {type: 'kishufiya-rendered-block', id: data.id, ...out};
    } catch (err) {
        reply = {type: 'kishufiya-rendered-block', id: data.id, error: String((err && err.message) || err)};
    }
    if (event.source) event.source.postMessage(reply, event.origin);
});

ready.then(() => {
    if (window.parent !== window) window.parent.postMessage({type: 'kishufiya-block-render-ready'}, location.origin);
});
