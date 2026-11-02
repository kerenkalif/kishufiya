// כישופייה: the "Tidy up blocks" button of the menu bar (Keren, 2026-11-02), like "format code" in an editor.
// Scripts move only when the child presses it - nothing tidies on its own. The arrangement is scratch-blocks'
// own (what the right-click "Clean up Blocks" does: one column, every script and loose block, one undo step),
// written out here rather than calling workspace.cleanUp(): the editor-devtools addon may wrap that method,
// and its version can ask to delete loose blocks, which this button must never do.

const tidyBlocks = () => {
    const SB = window.ScratchBlocks;
    const workspace = SB && SB.getMainWorkspace ? SB.getMainWorkspace() : null;
    if (!workspace || (workspace.isDragging && workspace.isDragging())) return;
    const tops = workspace.getTopBlocks(true);
    if (tops.length === 0) return;
    workspace.setResizesEnabled(false);
    SB.Events.setGroup(true);
    try {
        let cursorY = 0;
        for (const block of tops) {
            const xy = block.getRelativeToSurfaceXY();
            block.moveBy(-xy.x, cursorY - xy.y);
            block.snapToGrid();
            cursorY = block.getRelativeToSurfaceXY().y + block.getHeightWidth().height + SB.BlockSvg.MIN_BLOCK_Y;
        }
    } finally {
        SB.Events.setGroup(false);
        workspace.setResizesEnabled(true);
    }
    // the view follows, so the child sees the result however far away the scripts were scrolled
    workspace.centerOnBlock(tops[0].id);
};

export default tidyBlocks;
