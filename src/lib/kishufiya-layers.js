// כישופייה: the stage order of the sprites, the one change a click on a block can make that the VM does not
// call a change ("העבר לשכבה ה" reorders the layers, PROJECT_CHANGED stays silent). It must be saved all the same.
// Only the order counts, not the rest of the project: running the game moves the sprites, and that is no change.

// The sprites back to front, as one string; entries are {id, layer} of the real sprites (no stage, no clones).
export const stageOrder = entries => entries
    .slice()
    .sort((a, b) => a.layer - b.layer)
    .map(entry => entry.id)
    .join(',');

// Whether the order now differs from the baseline, the order last loaded or saved (null: none yet, no answer).
export const layerOrderChanged = (baseline, now) => baseline !== null && baseline !== now;
