// כישופייה: the code area scrolls only when it has to (Keren's decision, 2026-11-02; platform decision 49).
// scratch-blocks pads the scrollable area with half a screen on every side and at least a screen of content
// (getContentDimensionsBounded_), so the area always exceeds the view and both scrollbars always show. Here the padding
// is a small constant, the view itself is always part of the area (nothing can be dropped out of reach, and a view that
// is left where it was after blocks go is not stranded), and a scrollbar with nothing to scroll is hidden.
// Installed once on the scratch-blocks namespace, the way the guide wraps its prototypes: node_modules is untouched.

import {TOP_MARGIN} from './kishufiya-tidy-layout.js';

export const SCROLL_PAD = 24; // px of room past the outermost block on every side...
// ...except the top: tidy puts the first script TOP_MARGIN below the top of the view, so a bigger top pad would make the
// area taller than the view (8px at 24 vs 16) and a vertical bar would show with only a few scripts, found when run
export const SCROLL_PAD_TOP = TOP_MARGIN;

// Anything within this many px of the view does not count as overflow (sub-pixel rounding of the metrics)
export const OVERFLOW_SLACK = 1;

// Pure. content: {left, top, right, bottom} of the blocks in px from the workspace origin, null with no blocks;
// view: {left, top, width, height} the visible rectangle in the same coordinates; pad: {left, right, top, bottom}
// (the side the palette covers also pads by its width, so a block at that end can be scrolled out from under it).
// Returns {left, top, width, height}: the padded blocks and the view, together.
export const scrollArea = (content, view, pad) => {
    const left = content ? Math.min(content.left - pad.left, view.left) : view.left;
    const top = content ? Math.min(content.top - pad.top, view.top) : view.top;
    const right = content ? Math.max(content.right + pad.right, view.left + view.width) : view.left + view.width;
    const bottom = content ? Math.max(content.bottom + pad.bottom, view.top + view.height) : view.top + view.height;
    return {left, top, width: right - left, height: bottom - top};
};

// Whether a bar has anything to scroll: the area is longer than the view
export const overflows = (areaLength, viewLength) => areaLength - viewLength > OVERFLOW_SLACK;

export const installScrollPolicy = SB => {
    const WorkspaceSvg = SB.WorkspaceSvg;
    const Scrollbar = SB.Scrollbar;
    const ScrollbarPair = SB.ScrollbarPair;
    if (WorkspaceSvg.getContentDimensionsBounded_.isKishufiya) return;

    WorkspaceSvg.getContentDimensionsBounded_ = (ws, svgSize) => {
        const box = WorkspaceSvg.getContentDimensionsExact_(ws);
        const empty = box.width === 0 && box.height === 0;
        const flyoutWidth = ws.flyout_ && ws.flyout_.width_ ? ws.flyout_.width_ : 0;
        const area = scrollArea(
            empty ? null : box,
            {left: -ws.scrollX, top: -ws.scrollY, width: svgSize.width, height: svgSize.height},
            {
                left: SCROLL_PAD + (ws.RTL ? 0 : flyoutWidth),
                right: SCROLL_PAD + (ws.RTL ? flyoutWidth : 0),
                top: SCROLL_PAD_TOP,
                bottom: SCROLL_PAD
            }
        );
        return area;
    };
    WorkspaceSvg.getContentDimensionsBounded_.isKishufiya = true;

    // A pair of bars (the main workspace's) never hid one in scratch-blocks (setVisible refuses); they do now.
    const show = (bar, visible) => {
        if (bar.isVisible_ === visible) return;
        bar.isVisible_ = visible;
        bar.updateDisplay_();
    };
    const resizeContentHorizontal = Scrollbar.prototype.resizeContentHorizontal;
    Scrollbar.prototype.resizeContentHorizontal = function (metrics) {
        resizeContentHorizontal.call(this, metrics);
        if (this.pair_) show(this, overflows(metrics.contentWidth, metrics.viewWidth));
    };
    const resizeContentVertical = Scrollbar.prototype.resizeContentVertical;
    Scrollbar.prototype.resizeContentVertical = function (metrics) {
        resizeContentVertical.call(this, metrics);
        if (this.pair_) show(this, overflows(metrics.contentHeight, metrics.viewHeight));
    };
    // the square where the two meet is only wanted when both are there
    const resize = ScrollbarPair.prototype.resize;
    ScrollbarPair.prototype.resize = function () {
        resize.call(this);
        if (this.corner_) {
            this.corner_.setAttribute('display', this.hScroll.isVisible_ && this.vScroll.isVisible_ ? 'block' : 'none');
        }
    };
};
