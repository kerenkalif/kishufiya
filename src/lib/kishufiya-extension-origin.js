/**
 * Extensions are loaded only from our own origin (TurboWarp disconnect, platform SPEC-scratch-independence 7).
 * Builtin extensions never come through here (the VM loads them by id). A future extension that we copy to
 * our own server as a file is allowed by being served from the same origin. A URL that points anywhere else,
 * and any data: / blob: / file: URL (code carried inside the address), is refused.
 * @param {string} url URL as a string.
 * @returns {boolean} True if the URL is a file served from our origin
 */
const isOurOrigin = url => {
    try {
        const parsed = new URL(url, window.location.href);
        return (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
            parsed.origin === window.location.origin;
    } catch (e) {
        return false;
    }
};

export default isOurOrigin;
