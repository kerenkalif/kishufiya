// כישופייה: the "Tidy up blocks" button of the menu bar (Keren, 2026-11-02), like "format code" in an editor.
// Scripts move only when the child presses it - nothing tidies on its own. Where they go is
// kishufiya-tidy-layout.js: columns from the top right corner of the code area as it is seen now, so the view
// needs no scroll afterwards. One undo step; nothing is deleted. Written out here rather than calling
// workspace.cleanUp(): the editor-devtools addon may wrap that method, and its version can ask to delete loose
// blocks, which this button must never do.
import {codeArea} from '../components/kishufiya-guide/targets.js';
import {layoutScripts} from './kishufiya-tidy-layout.js';

const tidyBlocks = () => {
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
    const {positions} = layoutScripts(sizes, view);
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

export default tidyBlocks;
