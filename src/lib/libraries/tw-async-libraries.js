// כישופייה: the libraries come from the platform (Hebrew names, a tree of Hebrew tags, the lesson's
// characters first), with Scratch's own bundled lists as the fallback when the platform can't answer.
// The platform sends each item with all its tags and their ancestors, so the library's own tag filter
// and search work on it unchanged. Its tag buttons come with it (getLibraryTags).

import {rememberOurAssets} from '../kishufiya-assets';

let lesson = null;
const cache = {};

// The lesson the child is in, if any (kishufiya.jsx, from the 'load' message): its characters lead.
export const setLibraryLesson = slug => {
    if (slug === lesson) return;
    lesson = slug || null;
    for (const kind of Object.keys(cache)) delete cache[kind];
};

const bundled = {
    backdrop: () => import(/* webpackChunkName: "library-backdrops" */ './backdrops.json'),
    costume: () => import(/* webpackChunkName: "library-costumes" */ './costumes.json'),
    sound: () => import(/* webpackChunkName: "library-sounds" */ './sounds.json'),
    sprite: () => import(/* webpackChunkName: "library-sprites" */ './sprites.json')
};

const fromPlatform = kind => fetch(
    `/api/kishufiya/library/${kind}${lesson ? `?lesson=${encodeURIComponent(lesson)}` : ''}`,
    {credentials: 'same-origin'}
)
    .then(res => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then(body => {
        if (!Array.isArray(body.items) || body.items.length === 0) throw new Error('empty library');
        return body;
    });

const asyncLibrary = kind => () => {
    const entry = cache[kind];
    if (entry && entry.data) return entry.data;
    if (entry) return entry.promise;
    const promise = fromPlatform(kind)
        .catch(() => bundled[kind]().then(mod => ({items: mod.default, tags: null, initialTag: null})))
        .then(body => {
            rememberOurAssets(body.items);
            cache[kind] = {data: body.items, tags: body.tags, initialTag: body.initialTag};
            return body.items;
        }, err => {
            delete cache[kind];
            throw err;
        });
    cache[kind] = {promise};
    return promise;
};

// The platform's tag buttons for a kind, once its library has loaded; null means use Scratch's own.
export const getLibraryTags = kind => (cache[kind] && cache[kind].tags) || null;
// The button to open on: the lesson's characters, when the lesson has any of this kind.
export const getLibraryInitialTag = kind => (cache[kind] && cache[kind].initialTag) || null;

export const getBackdropLibrary = asyncLibrary('backdrop');
export const getCostumeLibrary = asyncLibrary('costume');
export const getSoundLibrary = asyncLibrary('sound');
export const getSpriteLibrary = asyncLibrary('sprite');
