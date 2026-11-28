// Does the editor show the lesson's own game? (Keren, 28.11: "the editor shows something that is NOT the
// current lesson game" -> own: false; no list of screens, no exceptions by name.) Told to the lesson as
// {type: 'showing', own} on change only, once after 'editor-ready' (own: true).
//
// Defined by what the editor can know in one place, not by screen: it shows another game when
//  - a project the page did not hand it is the one loaded (a file loaded from the computer: the VM says
//    PROJECT_LOADED while load() in kishufiya.jsx is not the one loading), or
//  - a full-screen layer that replaces the editor is open ("המשחקים שלי": the list of games, not this game).
// A dialog that belongs to working on this game (library pick, naming, costume and sound editors, settings)
// does not replace the editor and is not counted.

export const isOwn = ({foreignProject, replacedByLayer}) => !foreignProject && !replacedByLayer;

export const showingMessage = (told, own) => (told === own ? null : {type: 'showing', own});

// THE ONE ANSWER, readable from anywhere in the editor (away has one writer, the editor): `own` goes on every 'showing', on every
// 'code-area' and on 'editor-ready', so the page never infers it from a message that is not about it (the code area is measured
// forever, also while "המשחקים שלי" covers it). foreignProject is set by the page that loads projects (kishufiya.jsx).
let foreign = false;
export const setForeignProject = value => {
    foreign = Boolean(value);
};
export const ownNow = () => isOwn({foreignProject: foreign, replacedByLayer: layerIsOpen()});
// What the editor says when it is up: `own` is in it, so a page that hears it never starts from a guess.
export const editorReadyMessage = caps => ({type: 'editor-ready', runs: true, caps, own: ownNow()});

// Layers that replace the editor, registered while mounted. registerLayer returns the way to unregister.
const layers = new Set();
const layerListeners = new Set();
const changed = () => {
    for (const fn of layerListeners) fn();
};

export const registerLayer = () => {
    const token = {};
    layers.add(token);
    changed();
    return () => {
        layers.delete(token);
        changed();
    };
};

export const layerIsOpen = () => layers.size > 0;

export const onLayersChange = fn => {
    layerListeners.add(fn);
    return () => layerListeners.delete(fn);
};
