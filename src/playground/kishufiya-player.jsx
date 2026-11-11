/**
 * כישופייה's player: a lesson's finished game, played inside the lesson (2026-10-23) instead of Scratch's
 * own player. The game comes from the platform: ?project=/api/kishufiya/... (same origin only).
 * Licensed under the GNU General Public License version 3.
 *
 * A locked copy played against the class's board (shared cloud, unit 10, 2026-11-11): the same player with
 * ?shared. It is a player only - a stage, the green flag and the stop; no blocks, paint, library or name to
 * change - and it talks with the page holding it (same origin only). Without ?shared none of this is sent or
 * heard, and the player is as it was.
 *   player -> page  {kishufiya: 'loaded'}                 the game is in and the player listens
 *   player -> page  {kishufiya: 'error', message}         the game could not be loaded
 *   page -> player  {kishufiya: 'apply', values}          the board's values, {"☁ name": text or number}, put
 *                                                         into the game's ☁ variables, mid-run too; never
 *                                                         said back. One before 'loaded' waits for the game
 *   player -> page  {kishufiya: 'cloud-wrote', values}    the ☁ variables the game ITSELF set or changed,
 *                                                         {"☁ name": the value written, as text}: those only,
 *                                                         a second after the write at most, and at once when
 *                                                         the run ends (lib/kishufiya-cloud.js)
 *   player -> page  {kishufiya: 'running', on}            true from the first script that starts until the
 *                                                         last ends or the red stop, then false
 *   player -> page  {kishufiya: 'activity'}               a touch or a key in the player, one in 5 seconds at
 *                                                         most (lib/kishufiya-shared-player.js)
 * The ☁ values kept on the copy's own row are not read: the board's come from the page.
 */

import './import-first';
import '../lib/kishufiya-rtl-bubbles';

import React from 'react';
import {compose} from 'redux';
import AppStateHOC from '../lib/app-state-hoc.jsx';
import TWEmbedFullScreenHOC from '../lib/tw-embed-fullscreen-hoc.jsx';
import {Theme} from '../lib/themes/index.js';
import {LANGUAGE_KEY} from '../lib/detect-locale';
import {attachSharedCloud} from '../lib/kishufiya-cloud.js';
import {watchActivity, watchRunning} from '../lib/kishufiya-shared-player.js';

import GUI from './render-gui.jsx';
import render from './app-target';

try {
    localStorage.setItem(LANGUAGE_KEY, 'he');
} catch (e) { /* storage blocked: the player has almost no text anyway */ }

const fill = document.createElement('style');
fill.textContent = 'html, body, #app { height: 100%; margin: 0; overflow: hidden; }';
document.head.appendChild(fill);

const params = new URLSearchParams(location.search);
const project = params.get('project');
// Only a path on this site: the player never loads a project from somewhere else.
const source = project && project.startsWith('/') && !project.startsWith('//') ? project : null;

let vm = null;
let loaded = false;

// The game's report (2026-10-24): a game may keep a list named "דיווח" on its stage, one line per thing
// worth telling the teacher. Each new line goes up to the page holding the player, which records it.
// A green flag starts a new run; the game clears the list then, so lines are counted per run.
const REPORT_LIST = 'דיווח';
let run = 0;
let sent = 0;

const reportLines = () => {
    const stage = vm && vm.runtime.getTargetForStage();
    if (!stage) return null;
    const list = Object.values(stage.variables).find(v => v.type === 'list' && v.name === REPORT_LIST);
    return list ? list.value : null;
};

const toPage = message => {
    if (window.parent !== window) window.parent.postMessage({kishufiya: 'report', ...message}, location.origin);
};

const watchReport = () => {
    vm.runtime.on('PROJECT_START', () => {
        run += 1;
        // Lines of the run before stay in the list until the game clears it: they were sent already.
        sent = (reportLines() || []).length;
        toPage({run, start: true});
    });
    setInterval(() => {
        const lines = reportLines();
        if (!lines) return;
        if (lines.length < sent) sent = 0; // the game cleared the list
        if (lines.length > sent) {
            toPage({run, lines: lines.slice(sent).map(String)});
            sent = lines.length;
        }
    }, 500);
};

// A locked copy against the class's board (?shared, the messages are at the top).
const shared = params.has('shared');
const post = message => {
    if (window.parent !== window) window.parent.postMessage(message, location.origin);
};
let cloud = null; // the game's ☁ variables, once it is loaded (attachSharedCloud)
let waiting = null; // the board's values that came before the game did

const startShared = () => {
    cloud = attachSharedCloud(vm, values => post({kishufiya: 'cloud-wrote', values}));
    watchRunning(vm.runtime, on => {
        // what the game wrote last goes first: the page's request after a run carries the score
        if (!on) cloud.flush();
        post({kishufiya: 'running', on});
    });
    watchActivity(window, () => post({kishufiya: 'activity'}));
    if (waiting) cloud.apply(waiting);
    waiting = null;
    post({kishufiya: 'loaded'});
};

if (shared) {
    window.addEventListener('message', e => {
        if (e.origin !== location.origin || e.source !== window.parent || window.parent === window || !e.data) return;
        const {values} = e.data;
        if (e.data.kishufiya !== 'apply' || !values || typeof values !== 'object') return;
        if (cloud) cloud.apply(values);
        else waiting = {...waiting, ...values};
    });
}

const onVmInit = _vm => {
    vm = _vm;
};

// The editor's own default project loads first; the lesson's game replaces it once that is done.
const onProjectLoaded = () => {
    if (loaded || !source) return;
    loaded = true;
    fetch(source, {credentials: 'same-origin'})
        .then(res => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(`HTTP ${res.status}`))))
        .then(data => vm.loadProject(data))
        .then(() => {
            watchReport();
            if (shared) startShared();
            if (params.has('autoplay')) {
                vm.start();
                vm.greenFlag();
            }
        })
        .catch(err => {
            document.body.setAttribute('data-error', String(err && err.message));
            if (shared) post({kishufiya: 'error', message: String((err && err.message) || err)});
        });
};

const WrappedGUI = compose(
    AppStateHOC,
    TWEmbedFullScreenHOC
)(GUI);

render(<WrappedGUI
    isEmbedded
    isPlayerOnly
    projectId="0"
    onVmInit={onVmInit}
    onProjectLoaded={onProjectLoaded}
    routingStyle="none"
    theme={Theme.light}
/>);
