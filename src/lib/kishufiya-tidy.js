// כישופייה: the "Tidy up blocks" button of the menu bar (Keren, 2026-11-02), like "format code" in an editor.
// Scripts move only when the child presses it - nothing tidies on its own. It is scratch-blocks' own
// workspace.cleanUp (the right-click "Clean up Blocks"), one undo step.

const tidyBlocks = () => {
    const SB = window.ScratchBlocks;
    const workspace = SB && SB.getMainWorkspace ? SB.getMainWorkspace() : null;
    if (!workspace || (workspace.isDragging && workspace.isDragging())) return;
    workspace.cleanUp();
    // the view follows, so the child sees the result however far away the scripts were scrolled
    const first = workspace.getTopBlocks(true)[0];
    if (first) workspace.centerOnBlock(first.id);
};

export default tidyBlocks;
