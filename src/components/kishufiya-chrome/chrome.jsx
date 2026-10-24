// כישופייה: what the page around the editor shows in the editor's own menu bar (2026-10-23), so the
// screen has one top row, not two: the save status, a way back to the lesson when it is hidden, and
// the way home. The page sends it ({kishufiya: 'chrome'}, kishufiya.jsx); the buttons answer it.
import React, {useEffect, useState} from 'react';
import styles from './chrome.css';

let state = {status: '', lessonHidden: false, alone: false};
const listeners = new Set();

export const setChrome = next => {
    state = {...state, ...next};
    for (const listener of listeners) listener(state);
};

let send = () => {};
export const setChromeSender = fn => {
    send = fn;
};

const useChrome = () => {
    const [current, setCurrent] = useState(state);
    useEffect(() => {
        listeners.add(setCurrent);
        setCurrent(state);
        return () => listeners.delete(setCurrent);
    }, []);
    return current;
};

const openLesson = () => send({kishufiya: 'lesson-open'});
// The child's main page on the platform; opened alone (the open-source editor, no platform around it),
// its sign-in page.
export const goHome = () => {
    if (window.parent === window) window.location.href = 'https://kesemhacode.co.il/my';
    else send({kishufiya: 'navigate', href: '/my'});
};

// The row's first button: while the lesson is hidden, "להצגת תוכן העניינים" brings it back (Keren,
// 2026-10-24); in a game with no lesson, back to the child's main page: "בחזרה ל" and the starred name of
// "קסם הקוד" (its logo on the platform) - Keren, 2026-10-23.
export const LessonButton = () => {
    const {lessonHidden, alone} = useChrome();
    if (!lessonHidden && !alone) return null;
    if (!alone) {
        return (
            <button
                className={styles.lesson}
                onClick={openLesson}
            >
                {'📖 להצגת תוכן העניינים'}
            </button>
        );
    }
    return (
        <button
            className={styles.lesson}
            aria-label="בחזרה לקסם הקוד"
            onClick={goHome}
        >
            {'בחזרה ל'}
            <span
                className={styles.mark}
                aria-hidden="true"
            >
                <span className={styles.star}>{'✦'}</span>
                {'קסם הקוד'}
                <span className={styles.star}>{'✦'}</span>
            </span>
        </button>
    );
};

// Before the logo: whether the game is saved, and the way to the child's main page.
export const StatusArea = () => {
    const {status} = useChrome();
    return (
        <div className={styles.area}>
            {status && (
                <span
                    className={styles.status}
                    aria-live="polite"
                >
                    {status}
                </span>
            )}
            <button
                className={styles.home}
                title="לדף הראשי"
                aria-label="לדף הראשי"
                onClick={goHome}
            >
                {'🏠'}
            </button>
        </div>
    );
};
