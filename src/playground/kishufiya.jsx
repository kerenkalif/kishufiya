/**
 * הכישופייה - the editor of קסם הקוד, embedded in the platform's lesson page.
 * Based on TurboWarp's scratch-gui. Licensed under the GNU General Public License version 3.
 *
 * The page that embeds this one (same origin only) drives it with postMessage:
 *   parent -> editor  {kishufiya: 'hello'}           are you up? (answered with 'ready' once the VM is)
 *   parent -> editor  {kishufiya: 'load', url, title, lesson, gameId}
 *                                                    load a project (.sb3) from a URL; title names it (the
 *                                                    file a child downloads is called by it); lesson: the
 *                                                    lesson's slug, whose characters the library shows first;
 *                                                    gameId: the game's id in "המשחקים שלי", once it has one
 *   editor -> parent  {kishufiya: 'navigate', href}  the child picked a game in "המשחקים שלי": save, then go
 *   editor -> parent  {kishufiya: 'renamed', title}  the child renamed the game in the menu bar's title field
 *   parent -> editor  {kishufiya: 'chrome', status, lessonHidden, alone}  alone: a game with no lesson
 *                                                    what the page shows in the editor's menu bar
 *                                                    (kishufiya-chrome): the save status, the lesson's button
 *   editor -> parent  {kishufiya: 'lesson-open'}     the child wants the hidden lesson back
 *   parent -> editor  {kishufiya: 'save', id, thumbnail}  ask for the project as .sb3; thumbnail false:
 *                                                    without the stage's picture (the page wants it seldom)
 *   editor -> parent  {kishufiya: 'ready'}           the editor is up and listening
 *   editor -> parent  {kishufiya: 'loaded'} / {kishufiya: 'error', message}
 *   editor -> parent  {kishufiya: 'changed'}         the child changed something since the last save
 *   parent -> editor  {kishufiya: 'title', title}     rename the game (the child renamed it on the platform)
 *   editor -> parent  {kishufiya: 'saved', id, data, thumbnail}
 *                                                    data: the .sb3, thumbnail: a PNG of the stage (or null);
 *                                                    both ArrayBuffers, transferred
 *   lesson <-> editor through the page, passed on as they are (the platform's KishufiyaLesson):
 *   lesson -> editor  {kishufiya: 'to-editor', msg: {type, ...}}
 *   editor -> lesson  {kishufiya: 'to-lesson', msg: {type, ...}}
 *     msg {type: 'project-please'} -> {type: 'project', project}: the game as project.json, also sent a
 *     moment after every change - the lesson opens a step once the game shows it done
 *     every other msg is the guide's: pointing, freezing, picking (components/kishufiya-guide/guide.js)
 *   editor -> parent  {kishufiya: 'width', px}       the least width the editor can work in (its stage shrinks
 *                                                    to fit whatever it is given above that)
 */

import './import-first';
import '../lib/kishufiya-rtl-bubbles';

import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {compose} from 'redux';
import {setStageSize, setStageWidth} from '../reducers/stage-size';
import {setProjectTitle} from '../reducers/project-title';
import {setProjectUnchanged} from '../reducers/project-changed';
import {STAGE_SIZE_MODES, STAGE_DISPLAY_SCALE_METADATA, MIN_DRAGGED_STAGE_WIDTH} from '../lib/layout-constants';
import AppStateHOC from '../lib/app-state-hoc.jsx';
import ErrorBoundaryHOC from '../lib/error-boundary-hoc.jsx';
import GUI from './render-gui.jsx';
import render from './app-target';
import {LANGUAGE_KEY} from '../lib/detect-locale';
import {setLibraryLesson} from '../lib/libraries/tw-async-libraries';
import MyGames from '../components/kishufiya-my-games/my-games.jsx';
import {setChrome, setChromeSender} from '../components/kishufiya-chrome/chrome.jsx';
import {Theme} from '../lib/themes';
import {attachGuide, handleGuide} from '../components/kishufiya-guide/guide.js';

// Always Hebrew, whatever the class PC's browser was set to last.
try {
    localStorage.setItem(LANGUAGE_KEY, 'he');
} catch (e) { /* storage blocked: detectLocale falls back to ?lang=he */ }

// The editor fills its frame; the GUI sizes itself to its parent's height.
const fill = document.createElement('style');
fill.textContent = 'html, body, #app { height: 100%; margin: 0; overflow: hidden; }';
document.head.appendChild(fill);

const parent = window.parent === window ? null : window.parent;
const post = (message, transfer) => {
    if (parent) parent.postMessage({...message}, location.origin, transfer);
};

let vm = null;
setChromeSender(message => post(message));
let up = false; // the VM exists and the editor's own default project has finished loading
let dirty = false;
let nameProject = () => {}; // set by <Bridge>, which can reach the GUI's store
// Also set by <Bridge>: the game as the page has it now is saved, so the editor's own "leave this page?"
// question (project-saver-hoc) stops popping up when the child presses home after a save.
let markSaved = () => {};
let gameId = null; // the open game's id in "המשחקים שלי"
let knownTitle = null; // the name as the platform has it: a change from it is the child's

// The game as the lesson sees it, a moment after a change: dragging a block fires many changes, and a
// change that leaves the game as it was (a click on a block) sends nothing. Measured 2026-10-24, on the
// saved (compressed) form: the biggest lesson game was 27KB and the lesson's check of it took about 3ms -
// the uncompressed form sent since 2026-10-25 is larger, not measured again.
let projectTimer = null;
let lastSent = null;
const sendProject = (again = false) => {
    clearTimeout(projectTimer);
    projectTimer = setTimeout(() => {
        if (!vm) return;
        // the blocks' own ids, not short ones made up for saving: the lesson rings a block of the child's by
        // its id, and a block just added had another id in the editor (2026-10-25)
        const project = vm.toJSON(null, {allowOptimization: false});
        if (project === lastSent && !again) return;
        lastSent = project;
        post({kishufiya: 'to-lesson', msg: {type: 'project', project}});
    }, 500);
};

// What the lesson asks of the editor.
const fromLesson = msg => {
    if (msg.type === 'project-please') sendProject(true);
    else handleGuide(msg);
};

// Loading a game builds it block by block, and the VM calls each block a change: not the child's, so not
// a reason to save (it cost one save per opened game, 2026-10-24).
let loading = false;

const load = async (url, title, lesson, id) => {
    setLibraryLesson(lesson);
    gameId = id || null;
    loading = true;
    try {
        const res = await fetch(url, {credentials: 'same-origin'});
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // 204: nothing to load, the child starts from the editor's own empty project
        if (res.status !== 204) await vm.loadProject(await res.arrayBuffer());
        if (title) {
            knownTitle = title;
            nameProject(title);
        }
        dirty = false;
        // The editor's own "leave this page?" too: building the game called every block a change, and the
        // browser asked about unsaved changes over a saved game (Keren, 2026-10-24).
        markSaved();
        post({kishufiya: 'loaded'});
        // and to the page beside it: what it sent before the game was in never arrived (the guide, a freeze)
        post({kishufiya: 'to-lesson', msg: {type: 'editor-ready'}});
        sendProject(true);
    } catch (e) {
        post({kishufiya: 'error', message: String((e && e.message) || e)});
    } finally {
        loading = false;
    }
};

// The stage as the renderer drew it last, for the list of the child's games.
const snapshot = () => new Promise(resolve => {
    try {
        vm.renderer.requestSnapshot(url => fetch(url).then(r => r.arrayBuffer())
            .then(resolve, () => resolve(null)));
    } catch (e) {
        resolve(null);
    }
});

const save = async (id, withThumbnail) => {
    // the project is read the moment it is asked for: a change from here on is the next save's, and says so
    dirty = false;
    const blob = await vm.saveProjectSb3();
    const data = await blob.arrayBuffer();
    markSaved();
    const thumbnail = withThumbnail === false ? null : await snapshot();
    post({kishufiya: 'saved', id, data, thumbnail}, thumbnail ? [data, thumbnail] : [data]);
};

window.addEventListener('message', e => {
    if (e.origin !== location.origin || e.source !== parent || !e.data || !up) return;
    if (e.data.kishufiya === 'hello') post({kishufiya: 'ready'});
    else if (e.data.kishufiya === 'load') load(e.data.url, e.data.title, e.data.lesson, e.data.gameId);
    else if (e.data.kishufiya === 'save') save(e.data.id, e.data.thumbnail);
    else if (e.data.kishufiya === 'to-editor' && e.data.msg) fromLesson(e.data.msg);
    else if (e.data.kishufiya === 'chrome') {
        const {status, lessonHidden, alone} = e.data;
        setChrome({status: status || '', lessonHidden: Boolean(lessonHidden), alone: Boolean(alone)});
    } else if (e.data.kishufiya === 'title' && e.data.title) {
        knownTitle = e.data.title;
        nameProject(e.data.title);
    }
});

const onVmInit = _vm => {
    vm = _vm;
    // the lesson points into the editor and hears what the child does (kishufiya-guide)
    attachGuide(vm, msg => post({kishufiya: 'to-lesson', msg}));
    vm.on('PROJECT_CHANGED', () => {
        if (loading) return;
        sendProject();
        if (dirty) return;
        dirty = true;
        post({kishufiya: 'changed'});
    });
    vm.on('EXTENSION_ADDED', () => sendProject()); // the pen, for one, is not a change of the project for the VM
};

// The default project loads first; a project loaded before it finished would be replaced by it.
const onProjectLoaded = () => {
    if (up) return;
    up = true;
    dirty = false;
    post({kishufiya: 'ready'});
};

// The stage starts large (Keren, 2026-10-24: the lesson starts hidden, so the editor has the room);
// fit() below makes it smaller when there is no room - the lesson strip opened, a small screen - and
// gives it back when the room returns.
// What the editor needs besides its stage, as gui.jsx works out its minWidth: more in the small
// layout, whose sprite pane is laid out differently. Narrow dragged stages take the small layout.
const NON_STAGE = {small: 624, large: 544};
const SMALL_LAYOUT_BELOW = 360;
const nonStageFor = stageWidth => (stageWidth < SMALL_LAYOUT_BELOW ? NON_STAGE.small : NON_STAGE.large);
const LEAST_WIDTH = NON_STAGE.small + MIN_DRAGGED_STAGE_WIDTH;

// The stage width the child chose (buttons, the splitter); the editor shrinks the stage below it only
// for lack of room, and gives it back when the room returns (the lesson beside it narrowed).
let preferredStage = null;
let fitting = false; // the next stage change is the editor's own, not the child's

const Bridge = connect(
    state => ({
        size: state.scratchGui.stageSize.stageSize,
        width: state.scratchGui.stageSize.width,
        title: state.scratchGui.projectTitle
    }),
    dispatch => ({
        onLarge: () => dispatch(setStageSize(STAGE_SIZE_MODES.large)),
        onTitle: title => dispatch(setProjectTitle(title)),
        onFit: stageWidth => dispatch(setStageWidth(stageWidth)),
        onSaved: () => dispatch(setProjectUnchanged())
    })
)(({size, width, title, onLarge, onTitle, onFit, onSaved}) => {
    useEffect(onLarge, []);
    nameProject = onTitle;
    markSaved = onSaved;
    // The child renamed the game in the title field: the platform keeps the name ("המשחקים שלי").
    useEffect(() => {
        const name = (title || '').trim();
        if (!up || knownTitle === null || !name || name === knownTitle) return;
        const timer = setTimeout(() => {
            knownTitle = name;
            post({kishufiya: 'renamed', title: name.slice(0, 60)});
        }, 800);
        return () => clearTimeout(timer);
    }, [title]);
    useEffect(() => post({kishufiya: 'width', px: LEAST_WIDTH}), []);
    useEffect(() => {
        const current = () => STAGE_DISPLAY_SCALE_METADATA[size === STAGE_SIZE_MODES.small ? 'small' : 'large'].width;
        // The editor starts in 'full' for a moment before the large stage it opens with: not a choice.
        if (size === STAGE_SIZE_MODES.full) return;
        if (fitting) fitting = false;
        else preferredStage = current();
        // The widest stage up to the child's choice that leaves the rest of the editor its room.
        const fit = () => {
            const want = preferredStage || current();
            let target = Math.min(want, window.innerWidth - nonStageFor(want));
            if (target < SMALL_LAYOUT_BELOW) target = Math.min(want, window.innerWidth - NON_STAGE.small);
            target = Math.max(MIN_DRAGGED_STAGE_WIDTH, Math.floor(target));
            if (target === current()) return;
            fitting = true;
            onFit(target);
            // the code area and the stage resize themselves on window resizes only
            requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
        };
        fit();
        window.addEventListener('resize', fit);
        return () => window.removeEventListener('resize', fit);
    }, [size, width]);
    return null;
});
Bridge.propTypes = {
    size: PropTypes.string,
    width: PropTypes.number,
    title: PropTypes.string,
    onLarge: PropTypes.func,
    onTitle: PropTypes.func,
    onFit: PropTypes.func,
    onSaved: PropTypes.func
};

// File > New (menu-bar.jsx): a new game of the child's own, never the open one emptied.
window.addEventListener('kishufiya-new-game', () => {
    fetch('/api/kishufiya/game', {method: 'POST', credentials: 'same-origin'})
        .then(res => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
        .then(body => post({kishufiya: 'navigate', href: `/my/games/${body.id}`}))
        .catch(() => window.dispatchEvent(new Event('kishufiya-my-games')));
});

// "המשחקים שלי", opened from the menu bar (menu-bar.jsx sends the event).
const MyGamesHost = () => {
    const [open, setOpen] = useState(false);
    useEffect(() => {
        const show = () => setOpen(true);
        window.addEventListener('kishufiya-my-games', show);
        return () => window.removeEventListener('kishufiya-my-games', show);
    }, []);
    if (!open) return null;
    return (
        <MyGames
            currentId={gameId}
            onClose={() => setOpen(false)} // eslint-disable-line react/jsx-no-bind
            onOpen={href => post({kishufiya: 'navigate', href})} // eslint-disable-line react/jsx-no-bind
        />
    );
};

const Editor = props => (
    <React.Fragment>
        <GUI {...props} />
        <Bridge />
        <MyGamesHost />
    </React.Fragment>
);

const WrappedGUI = compose(
    AppStateHOC,
    ErrorBoundaryHOC('Kishufiya')
)(Editor);

render(<WrappedGUI
    projectId="0"
    onVmInit={onVmInit}
    onProjectLoaded={onProjectLoaded}
    routingStyle="none"
    canEditTitle
    canChangeLanguage={false}
    canChangeTheme={false}
    theme={Theme.light}
    enableCommunity={false}
/>);
