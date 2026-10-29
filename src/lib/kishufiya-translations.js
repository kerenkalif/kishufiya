// Kishufiya (platform SPEC-lesson-flow rule 12, Keren 2026-10-29): the word for a block is "בלוק" everywhere a child
// or instructor reads it, never "לבנה". scratch-l10n's Hebrew says "לבנה"/"לבנים" in the GUI's messages
// (kishufiya-gui-words.json, applied here) and in scratch-blocks' (kishufiya-words.json, applied in blocks.js).
// Only a message that is still the original string is replaced, so a later translation is never overwritten, and
// the names of library sounds, sprites and backdrops ("(10) לבנת עץ") are not touched: they are not messages here.
import guiWords from './kishufiya-gui-words.json';

const applyKishufiyaTranslations = editorMessages => {
    for (const [locale, words] of Object.entries(guiWords)) {
        const table = editorMessages[locale];
        if (!table) continue;
        for (const [id, {was, is}] of Object.entries(words)) {
            if (table[id] === was) table[id] = is;
        }
    }
};

export {applyKishufiyaTranslations};
export default applyKishufiyaTranslations;
