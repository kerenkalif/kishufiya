// The editor's words for the platform (task 4, 2026-10-26): the lesson engine names the blocks, tabs and
// buttons a child sees, so it needs them as כישופייה shows them, not a hand-copied list that drifts.
// Writes build/kishufiya-words.json:
//   blocks: scratch-blocks' Hebrew messages over its English defaults (a message Hebrew lacks shows in
//           English in the editor too), with כישופייה's own words (src/lib/kishufiya-words.json) over them;
//   gui:    the GUI's Hebrew for what the guide talks about - the tabs, the variable button and its
//           dialog's OK, the new-message option, the extensions, the sprite info's fields.
// The platform copies them to src/lib/scratch/blocks-he.json and gui-he.json.
//   node scripts/export-words.mjs
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import editorMsgs from '../node_modules/@turbowarp/scratch-l10n/locales/editor-msgs.js';

const require = createRequire(import.meta.url);
const root = new URL('..', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const words = JSON.parse(read('src/lib/kishufiya-words.json'));
const twTranslations = require('../src/lib/tw-translations/generated-translations.json');

// scratch-blocks' message files are Closure scripts: run them over a stub.
const context = {goog: {provide () {}, require () {}}, Blockly: {Msg: {}, ScratchMsgs: {locales: {}}}};
vm.createContext(context);
vm.runInContext(read('node_modules/scratch-blocks/msg/messages.js'), context);
vm.runInContext(read('node_modules/scratch-blocks/msg/scratch_msgs.js'), context);
const english = context.Blockly.Msg;
const hebrew = context.Blockly.ScratchMsgs.locales.he;
if (!hebrew) throw new Error('scratch-blocks has no Hebrew messages');

const problems = [];
const blocks = {...english, ...hebrew};
for (const [id, {was, is}] of Object.entries(words.blocks.he)) {
    // the editor replaces only the original string (src/lib/blocks.js): a changed translation is not ours
    if (hebrew[id] === was) blocks[id] = is;
    else problems.push(`blocks ${id}: scratch-blocks has ${JSON.stringify(hebrew[id])}, not ${JSON.stringify(was)}`);
}

// the GUI's Hebrew as the editor builds it (tw-translations mixes TurboWarp's over scratch-l10n's)
const gui = {...editorMsgs.he, ...twTranslations.he};
const GUI = {
    'codeTab': 'gui.gui.codeTab',
    'costumesTab': 'gui.gui.costumesTab',
    'backdropsTab': 'gui.gui.backdropsTab',
    'soundsTab': 'gui.gui.soundsTab',
    'ok': 'gui.prompt.ok',
    'cancel': 'gui.prompt.cancel',
    'addExtension': 'gui.gui.addExtension',
    'chooseExtension': 'gui.extensionLibrary.chooseAnExtension',
    'chooseSprite': 'gui.spriteSelector.addSpriteFromLibrary',
    'paintSprite': 'gui.spriteSelector.addSpriteFromPaint',
    'chooseBackdrop': 'gui.spriteSelector.addBackdropFromLibrary',
    'chooseCostume': 'gui.costumeTab.addCostumeFromLibrary',
    'chooseSound': 'gui.soundTab.addSoundFromLibrary',
    'stage': 'gui.stageSelector.stage',
    'spriteName': 'gui.SpriteInfo.sprite',
    'spriteShow': 'gui.SpriteInfo.show',
    'spriteSize': 'gui.SpriteInfo.size',
    'spriteDirection': 'gui.SpriteInfo.direction',
    'extension.pen': 'gui.extension.pen.name',
    'extension.music': 'gui.extension.music.name',
    'extension.videoSensing': 'gui.extension.videosensing.name',
    'extension.text2speech': 'gui.extension.text2speech.name',
    'extension.translate': 'gui.extension.translate.name'
};
const out = {};
for (const [name, id] of Object.entries(GUI)) {
    if (gui[id]) out[name] = gui[id];
    else problems.push(`gui ${name}: no Hebrew for ${id}`);
}
// the sprite info's x and y are drawn as is (sprite-info.jsx <Label text="x">)
out.spriteX = 'x';
out.spriteY = 'y';
// in the palette and the variable dialog: scratch-blocks' words
out.variableButton = blocks.NEW_VARIABLE;
out.listButton = blocks.NEW_LIST;
out.variableDialog = blocks.VARIABLE_MODAL_TITLE;
out.newMessage = blocks.NEW_BROADCAST_MESSAGE;
out.messageDialog = blocks.BROADCAST_MODAL_TITLE;
for (const [id, text] of Object.entries(words.gui?.he ?? {})) out[id] = text;

mkdirSync(new URL('build/', root), {recursive: true});
writeFileSync(new URL('build/kishufiya-words.json', root), `${JSON.stringify({blocks, gui: out}, null, 2)}\n`);
const counts = `${Object.keys(blocks).length} block messages, ${Object.keys(out).length} GUI words`;
console.log(`build/kishufiya-words.json: ${counts}`);
for (const problem of problems) console.warn(`warning: ${problem}`);
if (problems.length) process.exitCode = 1;
