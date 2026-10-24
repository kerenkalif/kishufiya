// כישופייה guide: where a target of the guide is on the screen right now.
// Targets (all optional fields; exactly one kind per target):
//   {block: opcode, in: 'palette'}            a block in the block palette (flyout)
//   {block: opcode, in: 'code', inside?: opcode}
//                                              a block in the open sprite's code; inside: prefer the one
//                                              that sits inside a block of that kind (e.g. control_forever)
//   {block, in: 'code', field}                 one of its inputs or fields, by Scratch's name (X, DY,
//                                              STOP_OPTION, TOUCHINGOBJECTMENU...): where to type a number
//                                              or open a menu; its value is reported with it
//   {block, in: 'palette' | 'code', to: {block, inside?, top?, where}}
//                                              a palette block, and where in the code it goes: under that
//                                              block (where 'next'), into its mouth ('substack') or into
//                                              one of its inputs ('input:NAME') - a ghost of it is shown
//                                              moving there. A block of the code moves with the ones under
//                                              it. top: of several such blocks, the one under that hat
//   {blockId}                                  one block of the open sprite's code, by id
//   {category: id}                             a category of the palette (motion, looks, control, ...)
//   {ui: name}                                 a part of the editor, see UI below
//   {sprite: name}                             a sprite's tile in the sprite list
// A palette block whose category is not in view resolves to its category: the child opens the
// category; the palette is never scrolled for them (Keren, 2026-10-23). A code block of a sprite that
// is not open resolves to that sprite's tile, the same way.

// Scratch's own prefix of each opcode → the palette's category id.
const CATEGORY_OF_PREFIX = {
    motion: 'motion',
    looks: 'looks',
    sound: 'sound',
    event: 'events',
    control: 'control',
    sensing: 'sensing',
    operator: 'operators',
    data: 'variables',
    procedures: 'myBlocks',
    argument: 'myBlocks',
    pen: 'pen',
    music: 'music',
    videoSensing: 'videoSensing',
    text2speech: 'text2speech'
};
export const categoryOf = opcode => CATEGORY_OF_PREFIX[String(opcode).split('_')[0]] || null;

// Parts of the editor by the names of their CSS modules ("[file]_[class]_[hash]", webpack.config.js):
// the file and class names stay put across builds, only the hash changes.
const UI = {
    'green-flag': '[class*="green-flag_green-flag_"]',
    'stop': '[class*="stop-all_stop-all_"]',
    'add-sprite': '[class*="sprite-selector_add-button_"]',
    'add-backdrop': '[class*="stage-selector_add-button_"]',
    'stage': '[class*="stage_stage_"]',
    'sprite-info': '[class*="sprite-info_sprite-info_"]',
    'code-tab': '[class*="gui_tab-list_"] > li:nth-child(1)',
    'costumes-tab': '[class*="gui_tab-list_"] > li:nth-child(2)',
    'sounds-tab': '[class*="gui_tab-list_"] > li:nth-child(3)',
    'menu-bar': '[class*="menu-bar_menu-bar_"]'
};
export const uiElement = name => (UI[name] ? document.querySelector(UI[name]) : null);

export const workspace = () => {
    const SB = window.ScratchBlocks;
    return SB && SB.getMainWorkspace ? SB.getMainWorkspace() : null;
};

const shown = rect => rect && rect.width > 0 && rect.height > 0;
const rectOf = el => {
    if (!el || !el.getBoundingClientRect) return null;
    const rect = el.getBoundingClientRect();
    return shown(rect) ? rect : null;
};

const flyoutSvg = ws => {
    const flyout = ws && ws.getFlyout && ws.getFlyout();
    return flyout && flyout.svgGroup_ ? flyout.svgGroup_ : null;
};

// The code area: the workspace's SVG without the palette's categories and blocks beside it.
export const codeArea = () => {
    const ws = workspace();
    const svg = rectOf(ws && ws.getParentSvg());
    if (!svg) return null;
    let left = svg.left;
    let right = svg.right;
    const side = [rectOf(flyoutSvg(ws)), rectOf(document.querySelector('.blocklyToolboxDiv'))];
    for (const r of side) {
        if (!r) continue;
        const center = (r.left + r.right) / 2;
        if (center > (svg.left + svg.right) / 2) right = Math.min(right, r.left);
        else left = Math.max(left, r.right);
    }
    if (right - left < 20) return null;
    return {left, right, top: svg.top, bottom: svg.bottom, width: right - left, height: svg.bottom - svg.top};
};

const realBlock = block => {
    let b = block;
    while (b && b.isShadow && b.isShadow()) b = b.getParent();
    return b;
};

// The kinds of the blocks around a block, innermost first ("inside" a forever, an if...).
export const surrounding = block => {
    const kinds = [];
    let b = block && block.getSurroundParent();
    while (b) {
        kinds.push(b.type);
        b = b.getSurroundParent();
    }
    return kinds;
};

const editingTarget = vm => (vm && vm.editingTarget) || null;
const spriteTile = name => {
    for (const el of document.querySelectorAll('[class*="sprite-selector-item_sprite-name_"]')) {
        if (el.textContent.trim() === name) {
            return el.closest('[class*="sprite-selector-item_sprite-selector-item_"]') || el;
        }
    }
    return null;
};

const codeBlock = (ws, target) => {
    if (target.blockId) return realBlock(ws.getBlockById(target.blockId));
    let all = ws.getAllBlocks(false).filter(b => b.type === target.block && !b.isShadow());
    // top: the one in the script that starts with that hat (two forevers: the flag's, not the clone's)
    if (target.top) all = all.filter(b => b.getRootBlock().type === target.top);
    if (target.inside) {
        const within = all.find(b => surrounding(b).includes(target.inside));
        if (within) return within;
    }
    return all[0] || null;
};

// A point of the workspace (a connection's x_, y_) on the screen: the canvas's own matrix carries the
// scroll, the zoom and the right-to-left mirroring.
const toScreen = (ws, x, y) => {
    const point = ws.getParentSvg().createSVGPoint();
    point.x = x;
    point.y = y;
    const p = point.matrixTransform(ws.getCanvas().getScreenCTM());
    return {x: p.x, y: p.y};
};

// Where a dragged block goes: the anchor block's connection, on the screen; or the anchor block to scroll
// to when it is out of the code area's view.
const dropPoint = (ws, to) => {
    const anchor = codeBlock(ws, to);
    if (!anchor) return {missing: 'no-anchor'};
    if (!rectOf(anchor.getSvgRoot())) return {offscreen: anchor};
    let connection = null;
    if (to.where === 'substack') {
        const mouth = anchor.getInput('SUBSTACK');
        connection = mouth && mouth.connection;
    } else if (to.where && to.where.startsWith('input:')) {
        const input = anchor.getInput(to.where.slice(6));
        connection = input && input.connection;
    } else connection = anchor.nextConnection;
    if (!connection) return {missing: 'no-connection'};
    return {point: toScreen(ws, connection.x_, connection.y_), anchor};
};

// One input or field of a block: the field itself (a menu on the block), or what fills the input (the
// number's own shadow block, a menu block, or a block the child put there). With its value as shown.
const fieldOf = (block, name) => {
    const field = block.getField && block.getField(name);
    if (field) return {rect: rectOf(field.getSvgRoot()), value: field.getText()};
    const input = block.getInput && block.getInput(name);
    const filler = input && input.connection && input.connection.targetBlock();
    if (!filler) return null;
    const row = filler.inputList && filler.inputList[0] && filler.inputList[0].fieldRow;
    const own = row && row[0];
    return {
        rect: rectOf(filler.svgPath_ || filler.getSvgRoot()),
        value: filler.isShadow() && own ? own.getText() : null
    };
};

// → {rect, via} where via says what is pointed at: 'block', 'category', 'ui', 'sprite', 'field';
// {offscreen: true, block} for a block of the code out of the code area's view;
// or {missing: reason} when it is nowhere on the screen.
export const resolve = (target, vm) => {
    if (!target) return {missing: 'no-target'};
    if (target.ui) {
        const rect = rectOf(uiElement(target.ui));
        return rect ? {rect, via: 'ui'} : {missing: 'ui'};
    }
    if (target.sprite && !target.block && !target.blockId) {
        const rect = rectOf(spriteTile(target.sprite));
        return rect ? {rect, via: 'sprite'} : {missing: 'sprite'};
    }
    const ws = workspace();
    if (!ws) return {missing: 'workspace'};
    if (target.category) {
        const rect = rectOf(document.querySelector(`.scratchCategoryId-${target.category}`));
        return rect ? {rect, via: 'category'} : {missing: 'category'};
    }
    if (target.in === 'palette') {
        const flyout = ws.getFlyout();
        const fws = flyout && flyout.getWorkspace();
        const block = fws && fws.getTopBlocks(false).find(b => b.type === target.block);
        const rect = block && rectOf(block.getSvgRoot());
        const area = rectOf(flyoutSvg(ws));
        const middle = rect && (rect.top + (Math.min(rect.height, 40) / 2));
        if (rect && area && middle >= area.top && middle <= area.bottom) {
            if (!target.to) return {rect, via: 'block'};
            const drop = dropPoint(ws, target.to);
            if (drop.offscreen) return {rect, via: 'block', block: drop.offscreen};
            return drop.point ? {rect, via: 'block', drop: drop.point} : {rect, via: 'block'};
        }
        const category = categoryOf(target.block);
        const item = category && rectOf(document.querySelector(`.scratchCategoryId-${category}`));
        return item ? {rect: item, via: 'category', category} : {missing: block ? 'palette' : 'not-in-palette'};
    }
    // in the code
    const open = editingTarget(vm);
    if (target.sprite && open && open.getName() !== target.sprite) {
        const rect = rectOf(spriteTile(target.sprite));
        return rect ? {rect, via: 'sprite'} : {missing: 'sprite'};
    }
    const block = codeBlock(ws, target);
    if (!block) return {missing: 'not-in-code'};
    const rect = rectOf(block.getSvgRoot());
    // scratch-blocks does not draw blocks out of the code area's view: there, but not on the screen
    if (!rect) return {offscreen: true, block};
    if (target.to) {
        const drop = dropPoint(ws, target.to);
        const own = block.svgPath_ ? rectOf(block.svgPath_) : rect;
        if (drop.offscreen) return {rect: own, via: 'block', block: drop.offscreen};
        return drop.point ? {rect: own, via: 'block', block, drop: drop.point} : {rect: own, via: 'block', block};
    }
    if (target.field) {
        const field = fieldOf(block, target.field);
        if (!field || !field.rect) return {missing: 'no-field'};
        return {rect: field.rect, via: 'field', block, value: field.value};
    }
    // only the block's own row, not the blocks it holds (a forever's mouth)
    const path = block.svgPath_ ? rectOf(block.svgPath_) : null;
    return {rect: path || rect, via: 'block', block};
};

// The block a pointer event landed on, in the open sprite's code (not the palette), or null.
export const blockAt = eventTarget => {
    const el = eventTarget && eventTarget.closest ? eventTarget.closest('[data-id]') : null;
    if (!el || el.closest('.blocklyFlyout')) return null;
    const ws = workspace();
    if (!ws || !ws.getParentSvg().contains(el)) return null;
    return realBlock(ws.getBlockById(el.getAttribute('data-id')));
};
