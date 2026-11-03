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
const MENU_LABELS = {
    he: {wide: 'לסדר לרוחב', long: 'לסדר לאורך'},
    en: {wide: 'Tidy up sideways', long: 'Tidy up in one column'}
};

// Once, on the scratch-blocks namespace (like the scroll policy): the workspace menu's "Clean up Blocks" item becomes
// the two, in this order, enabled when it was (more than one script). The item is found by the mark wsCleanupOption
// now puts on it, so a changed label (the editor-devtools addon renames it) does not matter.
export const installTidyMenu = SB => {
    const ContextMenu = SB.ContextMenu;
    if (ContextMenu.show.isKishufiya) return;
    const setLabels = locale => Object.assign(SB.Msg, {
        KISHUFIYA_TIDY_WIDE: (MENU_LABELS[locale] || MENU_LABELS.en).wide,
        KISHUFIYA_TIDY_LONG: (MENU_LABELS[locale] || MENU_LABELS.en).long
    });
    setLabels('en');
    const setLocale = SB.ScratchMsgs.setLocale;
    SB.ScratchMsgs.setLocale = function (locale, ...rest) {
        const result = setLocale.call(this, locale, ...rest);
        setLabels(locale);
        return result;
    };
    const wsCleanupOption = ContextMenu.wsCleanupOption;
    ContextMenu.wsCleanupOption = function (...args) {
        return Object.assign(wsCleanupOption.apply(this, args), {kishufiyaTidy: true});
    };
    const show = ContextMenu.show;
    ContextMenu.show = function (e, options, rtl) {
        const items = [];
        options.forEach(option => {
            if (!option.kishufiyaTidy) return items.push(option);
            items.push(
                {text: SB.Msg.KISHUFIYA_TIDY_WIDE, enabled: option.enabled, callback: () => tidyBlocks('wide')},
                {text: SB.Msg.KISHUFIYA_TIDY_LONG, enabled: option.enabled, callback: () => tidyBlocks('long')}
            );
        });
        return show.call(this, e, items, rtl);
    };
    ContextMenu.show.isKishufiya = true;
};

export default tidyBlocks;
