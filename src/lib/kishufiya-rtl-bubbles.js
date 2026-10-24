// כישופייה: a sprite's speech or thought bubble in Hebrew reads right to left (Keren, 2026-10-24).
// scratch-render draws each line with the canvas's default direction, left to right, so in
// "מצאו את האות בכתב!" the "!" landed on the right. A bubble whose text starts in a right-to-left
// script is drawn with the canvas set right to left, from the bubble's right edge.
import TextBubbleSkin from 'scratch-render/src/TextBubbleSkin';

// Letters of a right-to-left script (Hebrew, Arabic and their presentation forms).
const RTL_LETTER = '\\u0590-\\u08FF\\uFB1D-\\uFDFF\\uFE70-\\uFEFC';
// The first letter of a strong direction decides, as a paragraph's does.
const STRONG = new RegExp(`[A-Za-z\\u00C0-\\u024F\\u0370-\\u03FF\\u0400-\\u04FF${RTL_LETTER}]`);
const RTL = new RegExp(`[${RTL_LETTER}]`);
const rightToLeft = text => {
    const first = String(text || '').match(STRONG);
    return Boolean(first && RTL.test(first[0]));
};

const render = TextBubbleSkin.prototype._renderTextBubble;
TextBubbleSkin.prototype._renderTextBubble = function (scale) {
    if (!rightToLeft(this._text)) return render.call(this, scale);
    const ctx = this._canvas.getContext('2d');
    const fillText = ctx.fillText;
    ctx.fillText = (line, x, y) => {
        // measured now: the text area is laid out by the render itself, before the lines are drawn
        const right = this._textAreaSize.width - this._style.padding;
        ctx.save();
        ctx.direction = 'rtl';
        ctx.textAlign = 'start';
        fillText.call(ctx, line, right, y);
        ctx.restore();
    };
    try {
        return render.call(this, scale);
    } finally {
        delete ctx.fillText;
    }
};
