// Platform SPEC-lesson-flow rule 12 (Keren 2026-10-29): the Hebrew editor says "בלוק" for a block, never "לבנה".
//   npx jest test/unit/kishufiya-words
// Over the real messages: scratch-l10n's editor messages with kishufiya-translations applied (as reducers/locales.js
// does), and scratch-blocks' Hebrew with kishufiya-words.json applied (as blocks.js does).
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import applyKishufiyaTranslations from '../../../src/lib/kishufiya-translations.js';
import kishufiyaWords from '../../../src/lib/kishufiya-words.json';

const ROOT = path.join(__dirname, '..', '..', '..');
const OLD = /לבנ/;
// Names of library sounds, sprites and backdrops, which are things in the library and not words about blocks.
const LIBRARY_NAMES = new Set(['music.drumWoodBlock']);

const realEditorMessages = () => {
    const file = path.join(ROOT, 'node_modules', '@turbowarp', 'scratch-l10n', 'locales', 'editor-msgs.js');
    const module = {exports: {}};
    // eslint-disable-next-line no-new-func
    new Function('module', 'exports', 'require', fs.readFileSync(file, 'utf8').replace(/export default/, 'module.exports.default ='))(
        module, module.exports, require
    );
    return module.exports.default || module.exports;
};

const realBlocksHebrew = () => {
    const read = f => fs.readFileSync(path.join(ROOT, 'node_modules', 'scratch-blocks', 'msg', f), 'utf8');
    const context = {goog: {provide () {}, require () {}}, Blockly: {Msg: {}, ScratchMsgs: {locales: {}}}};
    vm.createContext(context);
    vm.runInContext(read('messages.js'), context);
    vm.runInContext(read('scratch_msgs.js'), context);
    return context.Blockly.ScratchMsgs.locales.he;
};

describe('the word for a block in the Hebrew editor', () => {
    test('the GUI messages say בלוק, except library names', () => {
        const messages = realEditorMessages();
        applyKishufiyaTranslations(messages);
        const left = Object.entries(messages.he).filter(([id, text]) => OLD.test(text) && !LIBRARY_NAMES.has(id));
        expect(left).toEqual([]);
        expect(messages.he['gui.customProcedures.myblockModalTitle']).toBe('צרו בלוק');
        expect(messages.he['boost.whenColor']).toBe('כאשר רואים בלוק בצבע [COLOR]');
        expect(messages.he['boost.seeingColor']).toBe('רואים בלוק בצבע [COLOR]?');
        // a library sound keeps its own name
        expect(messages.he['music.drumWoodBlock']).toBe('(10) לבנת עץ');
    });

    test('scratch-blocks Hebrew says בלוק once kishufiya-words are applied (the My Blocks category, make a block)', () => {
        const table = Object.assign({}, realBlocksHebrew());
        for (const [id, {was, is}] of Object.entries(kishufiyaWords.blocks.he)) {
            if (table[id] === was) table[id] = is;
        }
        expect(Object.entries(table).filter(([, text]) => OLD.test(text))).toEqual([]);
        expect(table.CATEGORY_MYBLOCKS).toBe('הבלוקים שלי');
        expect(table.NEW_PROCEDURE).toBe('יצירת בלוק');
    });
});
