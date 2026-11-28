// The bottom strip the base keeps (SPEC-editor-base 15.1 `reserve` {top, bottom}) as the stage's full-screen needs to know it:
// - the stage in full-screen is shrunk by it, so the base's key bar fits under the stage;
// - the browser's own full-screen is not used while it is there (it would hide the base's layer, the bar with it):
//   the stage's full-screen is then only the editor's own (CSS) mode.
// One number, set by the guide on every 'reserve'; the code area's own bottom is in the guide (guide.js applyReserve).
let keptBottom = 0;

export const keptBottomPx = () => keptBottom;

export const setKeptBottom = px => {
    const next = typeof px === 'number' && Number.isFinite(px) && px > 0 ? Math.round(px) : 0;
    if (next === keptBottom) return;
    keptBottom = next;
    // a stage already full-screen is measured again (tw-fullscreen-resizer-hoc listens to the window's resize)
    if (typeof window !== 'undefined' && typeof Event === 'function') window.dispatchEvent(new Event('resize'));
};

// May the stage's full-screen ask the browser for its own full-screen? Not while the base keeps a bottom strip.
export const browserFullscreenAllowed = () => keptBottom === 0;

// The height the full-screen stage can use: the window's, less the menu and spacing the editor takes, less the kept bottom.
export const fullScreenStageHeight = (windowHeight, adjustments) => Math.max(0, windowHeight - adjustments - keptBottom);
