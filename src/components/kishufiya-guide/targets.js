// כישופייה guide: where a target of the guide is on the screen right now.
// Targets (all optional fields; exactly one kind per target):
//   {block: opcode, in: 'palette'}            a block in the block palette (flyout)
//   {block: opcode, in: 'code', inside?: opcode}
//                                              a block in the open sprite's code; inside: prefer the one
//                                              that sits inside a block of that kind (e.g. control_forever)
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
    const all = ws.getAllBlocks(false).filter(b => b.type === target.block && !b.isShadow());
    if (target.inside) {
        const within = all.find(b => surrounding(b).includes(target.inside));
        if (within) return within;
    }
    return all[0] || null;
};

// → {rect, via} where via says what is pointed at: 'block', 'category', 'ui', 'sprite';
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
        if (rect && area && middle >= area.top && middle <= area.bottom) return {rect, via: 'block'};
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
