// Kishufiya (Keren, 2026-11-28): a negative number reads "-100" in a right-to-left editor, not "100-".
// A "-" before digits is a neutral mark: inside right-to-left text it takes the text's direction and lands on the
// right of the digits. This is the one rule for the drawn text (SVG and canvas); the GUI's HTML has its own, in
// css/ltr-numbers.css. Pure: no DOM, so test/unit/kishufiya-ltr-numbers runs without a browser.
//   - the blocks' fields (scratch-blocks draws a field's text as an SVG <text>): installLtrNumbers
//   - the stage's speech bubbles (a canvas): kishufiya-rtl-bubbles.js, through isolateSignedNumbers

const LRE = '‪';
const RLE = '‫';
const PDF = '‬';
const LRI = '⁦';
const PDI = '⁩';

// A number as a child types it: an optional sign (hyphen, minus sign, plus), digits, a decimal part, an exponent.
const ONLY_A_NUMBER = /^[-−+]?\d+(?:[.,]\d+)*(?:[eE][-+]?\d+)?$/;
// A signed number that starts a word (not "10-5", not "a-5"), as a token inside a longer text. No lookbehind
// (older Safari): the character before it is captured and put back.
const SIGNED_TOKEN = /(^|[\s([{,;:=])([-−+]\d+(?:[.,]\d+)*(?:[eE][-+]?\d+)?)(?![A-Za-z0-9_֐-׿])/g;

/**
 * Wraps each signed number in a text as a left-to-right isolate, so its sign stays on the left of its digits
 * inside right-to-left text. Words and unsigned numbers are not touched.
 * @param {string} text the text to draw
 * @return {string} the text, with isolates around signed numbers
 */
const isolateSignedNumbers = text => String(text).replace(SIGNED_TOKEN, (all, before, number) =>
    `${before}${LRI}${number}${PDI}`);

/**
 * What a block field draws, when the field's block is right to left: scratch-blocks wraps the text in a right to
 * left embedding (or, for a "math_number" block only, a left to right one). A text that is only a number is
 * always left to right, whatever the block type (an integer, an angle, a text field holding "-5"); text with
 * words stays right to left, with its signed numbers isolated.
 * @param {string} shown the display text scratch-blocks made
 * @return {string} the text to draw
 */
const fixFieldDisplay = shown => {
    if (typeof shown !== 'string' || shown.length < 2) return shown;
    const rtl = shown[0] === RLE && shown[shown.length - 1] === PDF;
    const ltr = shown[0] === LRE && shown[shown.length - 1] === PDF;
    if (!rtl && !ltr) return shown;
    const inner = shown.slice(1, -1);
    // scratch-blocks turns spaces into no-break spaces
    const plain = inner.replace(/ /g, ' ').trim();
    if (ONLY_A_NUMBER.test(plain)) return `${LRE}${inner}${PDF}`;
    if (ltr) return shown;
    return `${RLE}${isolateSignedNumbers(inner)}${PDF}`;
};

/**
 * Makes every field of the editor draw its numbers left to right. Once per ScratchBlocks (the editor mounts
 * more than once).
 * @param {object} ScratchBlocks the editor's ScratchBlocks
 */
const installLtrNumbers = ScratchBlocks => {
    if (ScratchBlocks.kishufiyaLtrNumbers) return;
    ScratchBlocks.kishufiyaLtrNumbers = true;
    const Field = ScratchBlocks.Field.prototype;
    const getDisplayText = Field.getDisplayText_;
    Field.getDisplayText_ = function () {
        return fixFieldDisplay(getDisplayText.call(this));
    };
    const updateTextNode = Field.updateTextNode_;
    Field.updateTextNode_ = function () {
        const result = updateTextNode.call(this);
        const node = this.textElement_ && this.textElement_.firstChild;
        if (node && node.nodeType === 3) node.nodeValue = fixFieldDisplay(node.nodeValue);
        return result;
    };
};

export {isolateSignedNumbers, fixFieldDisplay, installLtrNumbers};
