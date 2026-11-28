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
