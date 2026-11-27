// The editor's boxes for the page's conductor, read off the page (rects.js decides their shape): the open dialog, the control the
// child presses next, the visible box of the target's scroll container, and whether a block is being carried.
import {visibleOf, rectsOf} from './rects.js';
import {openMenuRects} from './open-menus.js';
import {scrollerBox, workspace} from './targets.js';

const MODAL = '[class*="modal_modal-content"], [class*="modal_modal-overlay"]';
const NEXT = '[class*="ok-button"], [class*="ok_button"]';

const sized = el => {
    const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    return r && r.width > 0 && r.height > 0 ? r : null;
};

// The open modal (a library, a prompt), else the first open menu or field editor.
export const dialogBox = doc => {
    const modal = sized(doc.querySelector(MODAL));
    if (modal) return modal;
    return openMenuRects(doc)[0] || null;
};

// The control that closes the open modal, when the editor has one (a prompt's OK); null otherwise.
export const nextBox = doc => {
    const modal = doc.querySelector(MODAL);
    return sized(modal && modal.querySelector(NEXT));
};

export const carriedNow = () => {
    const ws = workspace();
    return Boolean(ws && ws.isDragging && ws.isDragging());
};

// -> the optional fields of one guide-at / located answer. `scroller`: what was told of the target's scroll container, if any.
export const readRects = (doc, scroller, view) => {
    const box = scroller && scroller.id ? scrollerBox(scroller.id) : null;
    return rectsOf({dialog: dialogBox(doc), next: nextBox(doc), clip: visibleOf(box, view), carried: carriedNow()});
};
