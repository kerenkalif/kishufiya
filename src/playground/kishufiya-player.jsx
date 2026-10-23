/**
 * כישופייה's player: a lesson's finished game, played inside the lesson (2026-10-23) instead of Scratch's
 * own player. The game comes from the platform: ?project=/api/kishufiya/... (same origin only).
 * Licensed under the GNU General Public License version 3.
 */

import './import-first';

import React from 'react';
import {compose} from 'redux';
import AppStateHOC from '../lib/app-state-hoc.jsx';
import TWEmbedFullScreenHOC from '../lib/tw-embed-fullscreen-hoc.jsx';
import {Theme} from '../lib/themes/index.js';
import {LANGUAGE_KEY} from '../lib/detect-locale';

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
            if (params.has('autoplay')) {
                vm.start();
                vm.greenFlag();
            }
        })
        .catch(err => {
            document.body.setAttribute('data-error', String(err && err.message));
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
