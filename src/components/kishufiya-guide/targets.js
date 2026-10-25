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
//                                              one of its inputs ('input:NAME') - that place is outlined
//                                              (`drop`, or the input's `slot`). A block of the code moves
//                                              with the ones under it. top: of several such blocks, the one
//                                              under that hat; nth: 'last', the newest of them
//   {blockId}                                  one block of the open sprite's code, by id
//   {category: id}                             a category of the palette (motion, looks, control, ...)
//   {ui: name}                                 a part of the editor, see UI below
//   {sprite: name}                             a sprite's tile in the sprite list; with a block, a category
//                                              or a button, the sprite they belong to
//   {library: name}                            an item of the open library (sprites, backdrops...) by
//                                              the name it shows; while it is not in sight, the library's
//                                              search box (via 'search') - the child searches, nothing is
//                                              searched for them
// A palette block whose category is not in view resolves to its category: the child opens the
// category (the palette then scrolls to a block low in it, once). Any target that names a sprite (or
// 'Stage') other than the one open resolves to that sprite's tile first (ownerTile).

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
    'stage-tile': '[class*="stage-selector_stage-selector_"]',
    'stage': '[class*="stage_stage_"]',
    'sprite-info': '[class*="sprite-info_sprite-info_"]',
    'code-tab': '[class*="gui_tab-list_"] > li:nth-child(1)',
    'costumes-tab': '[class*="gui_tab-list_"] > li:nth-child(2)',
    'sounds-tab': '[class*="gui_tab-list_"] > li:nth-child(3)',
    'menu-bar': '[class*="menu-bar_menu-bar_"]',
    'sprite-name': '[class*="sprite-info_sprite-info_"] input[type="text"]',
    'library-search': '[class*="library_filter-input_"], [class*="filter_filter-input_"]'
};
// The sprite's numbers, in the order the sprite info shows them.
const NUMBERS = {'sprite-x': 0, 'sprite-y': 1, 'sprite-size': 2, 'sprite-direction': 3};
export const uiElement = name => {
    if (name in NUMBERS) {
        return document.querySelectorAll('[class*="sprite-info_sprite-info_"] input[type="number"]')[NUMBERS[name]] ||
            null;
    }
    return UI[name] ? document.querySelector(UI[name]) : null;
};

// A window of the editor over it (a library, a prompt), and in a prompt the box to name a new message or
// variable.
const WINDOW = '[class*="modal_modal-overlay"]';
const NAME_BOX = '[class*="prompt_variable-name-text-input_"]';
export const editorWindow = () => ({
    open: Boolean(document.querySelector(WINDOW)),
    naming: Boolean(document.querySelector(NAME_BOX))
});

const libraryItem = name => {
    const wanted = String(name).trim()
        .toLowerCase();
    for (const el of document.querySelectorAll('[class*="library-item_library-item-name_"]')) {
        if (el.textContent.trim().toLowerCase() === wanted) {
            return el.closest('[class*="library-item_library-item_"]') || el;
        }
    }
    return null;
};

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

// Sizes of the editor's blocks the guide measures with, in workspace units (x ws.scale on the screen).
const METRICS = {
    notch: 8, // a block's bottom notch: 'next' joins this far above its bottom
    arm: 16, // a C-block's top arm: its empty mouth starts this far in
    row: 48, // one row of a block: an empty mouth is this far below the C-block's top
    scriptGap: 32, // a new script goes this far under the lowest one
    scrollRoom: 90 // a palette block scrolled to keeps this much room above it (its neighbour, the title)
};
// ...and on the screen, in pixels
const PALETTE_ROW_PX = 40; // a palette block is in view when the middle of its first row is
const SPOT_ROOM_PX = 20; // a free spot for a new script keeps this much of the code area under it

// The tile of a sprite - or the backdrop's, for the stage's name ('Stage') - in the sprite list.
const tileOf = (vm, name) => {
    const stage = vm && vm.runtime.getTargetForStage && vm.runtime.getTargetForStage();
    return stage && stage.getName() === name ? uiElement('stage-tile') : spriteTile(name);
};

// A target of one sprite while another is open: that sprite's tile, to open it first - a palette block,
// a category, a button (its costumes tab) or a block of the code all belong to the sprite they name.
// -> {rect, via: 'sprite'}; {missing: 'sprite'} when there is no such tile; null when it is open already.
const ownerTile = (target, vm) => {
    const open = editingTarget(vm);
    if (!target.sprite || !open || open.getName() === target.sprite) return null;
    const rect = rectOf(tileOf(vm, target.sprite));
    return rect ? {rect, via: 'sprite'} : {missing: 'sprite'};
};

// the palette block scrolled into view for the open category, once (resolve below)
let paletteScrolledTo = null;

// `exclude`: a block that is not it (the block being moved is not its own anchor)
const codeBlock = (ws, target, exclude) => {
    if (target.blockId) return realBlock(ws.getBlockById(target.blockId));
    let all = ws.getAllBlocks(false).filter(b => b.type === target.block && !b.isShadow() && b.id !== exclude);
    // top: the one in the script that starts with that hat (two forevers: the flag's, not the clone's)
    if (target.top) all = all.filter(b => b.getRootBlock().type === target.top);
    if (target.inside) {
        const within = all.find(b => surrounding(b).includes(target.inside));
        if (within) return within;
    }
    // last: the newest of them (the second "when key pressed" the child just added)
    if (target.nth === 'last') return all[all.length - 1] || null;
    return all[0] || null;
};

// Where a dragged block goes, measured on the blocks as drawn (the connections' own coordinates came
// out shifted in a right-to-left editor): the anchor block's starting corner and its bottom ('next'),
// the top of its mouth ('substack'), or the input's slot ('input:NAME'); or the anchor block to scroll
// to when it is out of the code area's view.
const dropPoint = (ws, to, moved) => {
    const anchor = codeBlock(ws, to, moved);
    if (!anchor) return {missing: 'no-anchor'};
    const own = rectOf(anchor.svgPath_ || anchor.getSvgRoot());
    if (!own) return {offscreen: anchor};
    const startX = r => (ws.RTL ? r.right : r.left);
    if (to.where && to.where.startsWith('input:')) {
        const input = anchor.getInput(to.where.slice(6));
        const filler = input && input.connection && input.connection.targetBlock();
        const slot = filler && rectOf(filler.svgPath_ || filler.getSvgRoot());
        // the slot itself is outlined: a block's width stuck out of it into empty space (2026-10-25)
        return slot ? {point: {x: startX(slot), y: slot.top}, slot, anchor} : {missing: 'no-connection'};
    }
    if (to.where === 'substack') {
        const mouth = anchor.getInput('SUBSTACK');
        const first = mouth && mouth.connection && mouth.connection.targetBlock();
        const inside = first && rectOf(first.svgPath_ || first.getSvgRoot());
        if (inside) return {point: {x: startX(inside), y: inside.top}, anchor};
        // an empty mouth: under the C-block's top arm, one row down
        const arm = METRICS.arm * ws.scale;
        const y = own.top + (METRICS.row * ws.scale);
        return {point: {x: ws.RTL ? own.right - arm : own.left + arm, y}, anchor};
    }
    // next: right under the block's own row (its notch at the bottom left aside)
    return {point: {x: startX(own), y: own.bottom - (METRICS.notch * ws.scale)}, anchor};
};

// A free spot for a new script, in screen pixels: under the lowest script of the open sprite, lined up with
// the scripts' starting edge; null with no code, or when that spot is out of the code area's view.
const findFreeSpot = ws => {
    const rects = ws.getTopBlocks(false)
        .map(b => rectOf(b.getSvgRoot()))
        .filter(Boolean);
    if (!rects.length) return null;
    const bottom = Math.max(...rects.map(r => r.bottom));
    const x = ws.RTL ? Math.max(...rects.map(r => r.right)) : Math.min(...rects.map(r => r.left));
    const area = rectOf(ws.getParentSvg());
    const y = bottom + (METRICS.scriptGap * ws.scale);
    if (area && y + SPOT_ROOM_PX > area.bottom) return null;
    return {x, y};
};
// While a block is dragged it is among the top blocks: the spot found before the drag stays.
let lastFreeSpot = null;
const freeSpot = ws => {
    if (ws.isDragging && ws.isDragging()) return lastFreeSpot;
    lastFreeSpot = findFreeSpot(ws);
    return lastFreeSpot;
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
    // A sprite's own target while another sprite is open: its tile first. With no such tile a target of
    // the code is missing (a block of that kind in the open sprite is not it); a palette block, a category
    // or a button is shown as it is (a sprite the child named otherwise).
    const owner = (target.block || target.blockId || target.category || target.ui) && ownerTile(target, vm);
    if (owner && (owner.rect || !(target.in === 'palette' || target.category || target.ui))) return owner;
    if (target.ui === 'variable-name') {
        // the name box of the "new variable" (or new message) window while it is open; until then, the
        // button that opens it (Keren, 2026-10-25: the ring stayed on the category, behind the window)
        const input = document.querySelector(NAME_BOX);
        const rect = rectOf(input);
        if (rect) return {rect, via: 'ui', value: input.value, input: true};
        return resolve({ui: 'make-variable'}, vm);
    }
    if (target.ui === 'make-variable') {
        // the palette's "Make a Variable" button, by its callback (its words are translated); out of the
        // palette's view, its category - as for a block
        const ws = workspace();
        const flyout = ws && ws.getFlyout();
        const create = ws && ws.getButtonCallback && ws.getButtonCallback('CREATE_VARIABLE');
        const button = flyout && create && (flyout.buttons_ || []).find(one => one.callback_ === create);
        const rect = button && rectOf(button.svgGroup_);
        const area = rectOf(flyoutSvg(ws));
        if (rect && area && rect.top >= area.top && rect.bottom <= area.bottom) return {rect, via: 'ui'};
        const item = rectOf(document.querySelector('.scratchCategoryId-variables'));
        return item ? {rect: item, via: 'category', category: 'variables'} : {missing: 'ui'};
    }
    if (target.ui) {
        const el = uiElement(target.ui);
        const rect = rectOf(el);
        // a box to type in (the sprite's name, size...): its value, as for a block's field
        const value = el && el.tagName === 'INPUT' ? el.value : null;
        return rect ? {rect, via: 'ui', value, input: Boolean(el && el.tagName === 'INPUT')} : {missing: 'ui'};
    }
    if (target.library) {
        const item = libraryItem(target.library);
        const rect = rectOf(item);
        const grid = item && item.closest('[class*="library_library-scroll-grid_"]');
        const area = rectOf(grid) || {top: 0, bottom: window.innerHeight};
        const middle = rect && ((rect.top + rect.bottom) / 2);
        if (rect && middle >= area.top && middle <= area.bottom) return {rect, via: 'library'};
        const search = rectOf(uiElement('library-search'));
        return search ? {rect: search, via: 'search'} : {missing: 'library'};
    }
    // a sprite alone: its tile (with a category it is only the sprite the category is opened in)
    if (target.sprite && !target.block && !target.blockId && !target.category) {
        const rect = rectOf(tileOf(vm, target.sprite));
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
        // a variable's reporter by its name: all of them are one kind of block
        const ofIt = b => b.type === target.block &&
            (!target.variable || (b.getField('VARIABLE') && b.getField('VARIABLE').getText() === target.variable));
        const block = fws && fws.getTopBlocks(false).find(ofIt);
        const rect = block && rectOf(block.getSvgRoot());
        const area = rectOf(flyoutSvg(ws));
        const middle = rect && (rect.top + (Math.min(rect.height, PALETTE_ROW_PX) / 2));
        // While the palette scrolls nothing is ringed: for a moment it was the block passing by (2026-10-25).
        // scratch-blocks itself takes a target of 0 for none (it never animates to 0, and the 0 stays).
        if (flyout && flyout.scrollTarget) return {missing: 'scrolling'};
        if (rect && area && middle >= area.top && middle <= area.bottom) {
            if (!target.to) {
                // a new script's hat: a free spot under the code there is ("למקום ריק"), outlined like any drop
                const spot = block.nextConnection && !block.previousConnection ? freeSpot(ws) : null;
                return spot ? {rect, via: 'block', drop: spot} : {rect, via: 'block'};
            }
            const drop = dropPoint(ws, target.to);
            if (drop.offscreen) return {rect, via: 'block', block: drop.offscreen};
            return drop.point ? {rect, via: 'block', drop: drop.point, slot: drop.slot} : {rect, via: 'block'};
        }
        const category = categoryOf(target.block);
        // The child opened the block's category, and the block is lower down in it (or above, after a
        // scroll): the palette scrolls to it, once - within the category the child chose, no switch of
        // category (Keren, 2026-10-25: "הצג" is low in "מראה", and the arrow went back to "מראה" for ever).
        const toolbox = ws.getToolbox && ws.getToolbox();
        const selected = toolbox && toolbox.getSelectedItem && toolbox.getSelectedItem();
        const inIt = Boolean(block && selected && selected.id_ === category);
        if (!inIt) paletteScrolledTo = null;
        else if (paletteScrolledTo !== target.block) {
            paletteScrolledTo = target.block;
            // room above it for its neighbour and the category title (at the very top it hid under the
            // tabs). Not 0: scratch-blocks takes a target of 0 for none, and does not scroll.
            flyout.scrollTo(Math.max(1, block.getRelativeToSurfaceXY().y - METRICS.scrollRoom));
            return {missing: 'scrolling'};
        }
        const item = category && rectOf(document.querySelector(`.scratchCategoryId-${category}`));
        return item ? {rect: item, via: 'category', category} : {missing: block ? 'palette' : 'not-in-palette'};
    }
    // in the code (of the sprite open: ownerTile above)
    const block = codeBlock(ws, target);
    if (!block) return {missing: 'not-in-code'};
    const rect = rectOf(block.getSvgRoot());
    // scratch-blocks does not draw blocks out of the code area's view: there, but not on the screen
    if (!rect) return {offscreen: true, block};
    if (target.to) {
        const drop = dropPoint(ws, target.to, block.id);
        const own = block.svgPath_ ? rectOf(block.svgPath_) : rect;
        if (drop.offscreen) return {rect: own, via: 'block', block: drop.offscreen};
        if (!drop.point) return {rect: own, via: 'block', block};
        return {rect: own, via: 'block', block, drop: drop.point, slot: drop.slot};
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
