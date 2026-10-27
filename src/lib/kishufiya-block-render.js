// Kishufiya (2026-10-27): one block drawn on its own, as a standalone SVG, the way the editor draws it - for
// the platform's lesson texts, staff screens and review page, which show a block a text quotes as the block
// itself, with the values the text gives ("זוז 5 צעדים", "שנה [ניקוד ▾] ב 1"). Used by block-render.html
// (src/playground/block-render.jsx) and by the platform's blocks:render script, so there is one drawing.
//
// A request is the block's palette XML (the platform keeps it, harvested from this editor's palette) and the
// values to put in it, by input or field name: an input's value goes into its shadow's field, a field's into
// the field. A variable, list or message field takes the name as its text. PROCCODE renames a custom block.

const PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'font-family', 'font-size',
    'font-weight', 'opacity', 'visibility', 'display'];

// The styles scratch-blocks gives by CSS class, written onto each element, so the SVG stands alone.
const inline = (src, dst) => {
    const cs = getComputedStyle(src);
    const style = [];
    for (const p of PROPS) {
        const value = cs.getPropertyValue(p);
        if (!value) continue;
        if (p === 'visibility' && value === 'visible') continue;
        if (p === 'display' && value !== 'none') continue;
        if (p === 'opacity' && value === '1') continue;
        style.push(`${p}:${value}`);
    }
    if (src.tagName === 'text') style.push('white-space:pre');
    dst.setAttribute('style', style.join(';'));
    dst.removeAttribute('class');
    dst.removeAttribute('data-id');
    dst.removeAttribute('cursor');
    for (let i = 0; i < src.children.length; i++) inline(src.children[i], dst.children[i]);
};

const dataUris = new Map();
const embed = href => {
    if (!dataUris.has(href)) {
        dataUris.set(href, fetch(href).then(async res => {
            const type = (res.headers.get('content-type') || 'image/svg+xml').split(';')[0];
            const bytes = new Uint8Array(await res.arrayBuffer());
            let bin = '';
            for (const byte of bytes) bin += String.fromCharCode(byte);
            return `data:${type};base64,${btoa(bin)}`;
        }));
    }
    return dataUris.get(href);
};

// The palette picks a random colour for a colour window: fixed ones, so the same request gives the same file.
const FIXED_COLOURS = ['#4C97FF', '#FF6680'];

// Puts the values into the block's XML element.
const fill = (block, values) => {
    let nth = 0;
    for (const field of block.querySelectorAll('field[name="COLOUR"]')) {
        if (/^#[0-9a-f]{6}$/i.test(field.textContent)) field.textContent = FIXED_COLOURS[nth++ % 2];
    }
    for (const [name, value] of Object.entries(values || {})) {
        if (value === null || typeof value === 'undefined') continue;
        if (name === 'PROCCODE') {
            for (const m of block.querySelectorAll('mutation[proccode]')) m.setAttribute('proccode', String(value));
            continue;
        }
        // an input: the field of the shadow in it
        const child = tag => [...block.children]
            .find(c => c.tagName.toLowerCase() === tag && c.getAttribute('name') === name);
        const input = child('value');
        const field = (input && input.querySelector('shadow > field')) || child('field');
        if (!field) continue;
        field.textContent = String(value);
        // a variable, list or message by its name: a new one, not the palette's
        if (field.hasAttribute('variabletype')) field.removeAttribute('id');
    }
};

/**
 * Draws one block.
 * @param {object} ScratchBlocks the editor's ScratchBlocks
 * @param {object} workspace a workspace of its own, not the child's (it is cleared)
 * @param {string} xml the block's XML ("<block ...>" or "<xml><block ...></xml>")
 * @param {object} values input or field name → value
 * @return {Promise<{svg: string, width: number, height: number}>} the SVG and its size in the editor's units
 */
export const renderBlock = async (ScratchBlocks, workspace, xml, values) => {
    const text = xml.trim().startsWith('<xml') ? xml : `<xml>${xml}</xml>`;
    const dom = ScratchBlocks.Xml.textToDom(text).firstElementChild;
    fill(dom, values);
    ScratchBlocks.Events.disable();
    let block = null;
    try {
        workspace.clear();
        block = ScratchBlocks.Xml.domToBlock(dom, workspace);
        const root = block.getSvgRoot();
        const box = root.getBBox();
        if (!box.width || !box.height) throw new Error('empty box');
        const copy = root.cloneNode(true);
        inline(root, copy);
        copy.removeAttribute('transform');
        for (const img of copy.querySelectorAll('image')) {
            const href = img.getAttribute('xlink:href') || img.getAttribute('href');
            if (href && !href.startsWith('data:')) {
                img.removeAttribute('xlink:href');
                img.setAttribute('href', await embed(href));
            }
        }
        const pad = 1;
        const [x, y, w, h] = [box.x - pad, box.y - pad, box.width + (2 * pad), box.height + (2 * pad)]
            .map(n => Math.round(n * 100) / 100);
        const body = new XMLSerializer().serializeToString(copy)
            .replace(/ xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, '');
        return {
            svg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
                `viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${body}</svg>`,
            width: w,
            height: h
        };
    } finally {
        if (block) block.dispose(false);
        ScratchBlocks.Events.enable();
    }
};
