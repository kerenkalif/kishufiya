/**
 * What the player tells the page of a locked copy played against the class's board (shared cloud, unit 10,
 * 2026-11-11), besides its ☁ values (kishufiya-cloud.js attachSharedCloud): whether the game runs, and that a
 * child is there. The page asks the server for the board only while both are so (the platform's
 * shared-poll.ts); a touch or a key inside this frame never reaches the page's own document.
 */

// As the platform's limits.ts ACTIVITY_NOTE_EVERY_MS and activity.ts ACTIVITY_EVENTS.
export const ACTIVITY_NOTE_EVERY_MS = 5000;
export const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];

/**
 * Running: from the first script that starts (the green flag, or a key or a click the game answers) until
 * the last one ends or the red stop. Said on a change only. A game driven by keys starts and ends scripts
 * all the time: the grace after a stop is the page's to count, not ours.
 * @param {Runtime} runtime the VM's runtime
 * @param {function(boolean)} send true: it runs now; false: it stopped
 * @returns {undefined}
 */
export const watchRunning = (runtime, send) => {
    let running = false;
    const say = on => () => {
        if (running === on) return;
        running = on;
        send(on);
    };
    runtime.on('PROJECT_RUN_START', say(true));
    runtime.on('PROJECT_RUN_STOP', say(false));
};

/**
 * A touch or a key of a person (isTrusted: not one a script made up): the first at once, then one in
 * ACTIVITY_NOTE_EVERY_MS at most.
 * @param {EventTarget} target the player's window
 * @param {function()} send the child did something
 * @param {function(): number} now the time in ms
 * @returns {undefined}
 */
export const watchActivity = (target, send, now = Date.now) => {
    let last = null;
    const onEvent = event => {
        if (!event.isTrusted) return;
        const at = now();
        if (last !== null && at - last < ACTIVITY_NOTE_EVERY_MS) return;
        last = at;
        send();
    };
    for (const type of ACTIVITY_EVENTS) target.addEventListener(type, onEvent, {capture: true, passive: true});
};
