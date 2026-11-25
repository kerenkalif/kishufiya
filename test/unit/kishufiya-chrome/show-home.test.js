import {showHome} from '../../../src/components/kishufiya-chrome/chrome.jsx';

describe('kishufiya chrome: the home button', () => {
    test('hidden inside a lesson (framed, not alone)', () => {
        expect(showHome(false, true)).toBe(false);
    });
    test('kept for a game with no lesson', () => {
        expect(showHome(true, true)).toBe(true);
    });
    test('kept when the editor is opened by itself', () => {
        expect(showHome(false, false)).toBe(true);
        expect(showHome(true, false)).toBe(true);
    });
});
