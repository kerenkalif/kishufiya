// כישופייה: the "Tidy up blocks" button of the menu bar (Keren, 2026-11-02), like "format code" in an editor.
// Scripts move only when the child presses it - nothing tidies on its own. Where they go is
// kishufiya-tidy-layout.js: from the top right corner of the code area as it is seen now. "Wide" (the button, and
// the one any tidy the child did not ask for must use) puts columns side by side so the view needs no scroll
// afterwards; "long" (Keren, 2026-11-03) puts every script in one column and the child scrolls down. The workspace
// right-click menu offers both (installTidyMenu), in place of Blockly's "Clean up Blocks". One undo step; nothing
// is deleted. Written out here rather than calling workspace.cleanUp(): the editor-devtools addon may wrap that
// method, and its version can ask to delete loose blocks, which this button must never do.
import {codeArea} from '../components/kishufiya-guide/targets.js';
import {layoutScripts, layoutScriptsLong} from './kishufiya-tidy-layout.js';

const layouts = {wide: layoutScripts, long: layoutScriptsLong};

const tidyBlocks = (direction = 'wide') => {
    const SB = window.ScratchBlocks;
    const workspace = SB && SB.getMainWorkspace ? SB.getMainWorkspace() : null;
    if (!workspace || (workspace.isDragging && workspace.isDragging())) return;
    const tops = workspace.getTopBlocks(true);
    const area = codeArea();
    const ctm = workspace.getCanvas().getScreenCTM();
    if (tops.length === 0 || !area || !ctm) return;
    // screen px per workspace unit: the zoom AND any CSS scaling of the editor (workspace.scale alone misses the
    // latter, and the area's size is measured on screen), the same factor the corner below is converted with
    const scale = ctm.a;
    const sizes = tops.map(block => {
        const {width, height} = block.getHeightWidth();
        return {width: width * scale, height: height * scale};
    });
    // the horizontal scrollbar may sit over the bottom of the area when the columns need it
    const view = {width: area.width, height: area.height - SB.Scrollbar.scrollbarThickness, scale};
    const {positions} = layouts[direction](sizes, view);
    // the area's top right corner in workspace units
    const cornerX = (area.right - ctm.e) / ctm.a;
    const cornerY = (area.top - ctm.f) / ctm.d;
    workspace.setResizesEnabled(false);
    SB.Events.setGroup(true);
    try {
        tops.forEach((block, i) => {
            const rightEdge = cornerX - (positions[i].right / scale);
            // a block's place is its right edge in right-to-left, its left edge otherwise
            const x = workspace.RTL ? rightEdge : rightEdge - (sizes[i].width / scale);
            const y = cornerY + (positions[i].top / scale);
            const xy = block.getRelativeToSurfaceXY();
            block.moveBy(x - xy.x, y - xy.y);
        });
    } finally {
        SB.Events.setGroup(false);
        workspace.setResizesEnabled(true);
    }
};

// The labels of the two menu items; any language without one gets the English.
export const MENU_LABELS = {
    he: {wide: 'לסדר לרוחב', long: 'לסדר לאורך'},
    en: {wide: 'Tidy up sideways', long: 'Tidy up in one column'}
};

// Pure: the menu's options with the marked "Clean up Blocks" item (kishufiyaTidy, put on it by wsCleanupOption)
// replaced by the two, wide first, each enabled as it was. Everything else stays as it is, in its place.
export const tidyItems = (options, labels, run) => {
    const items = [];
    options.forEach(option => {
        if (!option.kishufiyaTidy) return items.push(option);
        items.push(
            {text: labels.wide, enabled: option.enabled, callback: () => run('wide')},
            {text: labels.long, enabled: option.enabled, callback: () => run('long')}
        );
    });
    return items;
};

// Once, on the scratch-blocks namespace (like the scroll policy): the workspace menu's "Clean up Blocks" item becomes
// the two. The item is found by the mark wsCleanupOption puts on it, so a changed label (the editor-devtools addon
// renames it) does not matter. The two exist before ContextMenu.show is called, so an addon that wraps show (api.js)
// and puts a separator on an item after them (it indexes its items against the menu's rows) sees the final list.
export const installTidyMenu = SB => {
    const {ContextMenu, WorkspaceSvg} = SB;
    if (!ContextMenu.wsCleanupOption || !WorkspaceSvg.prototype.showContextMenu_) return;
    if (WorkspaceSvg.prototype.showContextMenu_.isKishufiya) return;
    const labels = () => MENU_LABELS[SB.ScratchMsgs.currentLocale_] || MENU_LABELS.en;
    const wsCleanupOption = ContextMenu.wsCleanupOption;
    ContextMenu.wsCleanupOption = function (...args) {
        return Object.assign(wsCleanupOption.apply(this, args), {kishufiyaTidy: true});
    };
    // showContextMenu_ ends in one synchronous ContextMenu.show(e, options, rtl): that call, whichever wrapper is
    // the outermost by then, gets the expanded list
    const showContextMenu = WorkspaceSvg.prototype.showContextMenu_;
    WorkspaceSvg.prototype.showContextMenu_ = function (...args) {
        const show = ContextMenu.show;
        ContextMenu.show = (e, options, rtl) => {
            show.call(ContextMenu, e, tidyItems(options, labels(), tidyBlocks), rtl);
        };
        try {
            return showContextMenu.apply(this, args);
        } finally {
            ContextMenu.show = show;
        }
    };
    WorkspaceSvg.prototype.showContextMenu_.isKishufiya = true;
};

export default tidyBlocks;
