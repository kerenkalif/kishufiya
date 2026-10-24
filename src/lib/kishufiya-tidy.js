// כישופייה: scripts that cover one another move apart (Keren, 2026-10-24). Run when the code area shows a
// sprite's code - on entering the code tab or choosing another sprite - never while the child drags. Only a
// script that really covers another moves, straight down, just below it; the rest stay where the child put
// them. Scripts are taken top to bottom, so the one lower down is the one that moves.

const GAP = 16; // workspace units between a moved script and the one above it
const MAX_MOVES = 200;

const overlap = (a, b) => a.topLeft.x < b.bottomRight.x && b.topLeft.x < a.bottomRight.x &&
    a.topLeft.y < b.bottomRight.y && b.topLeft.y < a.bottomRight.y;

const tidyOverlaps = (workspace, ScratchBlocks) => {
    if (!workspace || (workspace.isDragging && workspace.isDragging())) return 0;
    const scripts = workspace.getTopBlocks(true)
        .map(block => ({block, rect: block.getBoundingRectangle()}))
        .sort((a, b) => a.rect.topLeft.y - b.rect.topLeft.y);
    const placed = [];
    let moves = 0;
    if (ScratchBlocks) ScratchBlocks.Events.setGroup(true);
    try {
        for (const script of scripts) {
            let again = true;
            while (again && moves < MAX_MOVES) {
                again = false;
                for (const above of placed) {
                    if (!overlap(script.rect, above.rect)) continue;
                    script.block.moveBy(0, above.rect.bottomRight.y + GAP - script.rect.topLeft.y);
                    script.rect = script.block.getBoundingRectangle();
                    moves++;
                    again = true;
                }
            }
            placed.push(script);
        }
    } finally {
        if (ScratchBlocks) ScratchBlocks.Events.setGroup(false);
    }
    return moves;
};

export default tidyOverlaps;
