// The lesson's 'tidy' message (guide.js, detect.js tidyWhen), Keren 2026-11-17.
//   npx jest test/unit/kishufiya-guide/tidy-when
import {tidyWhen} from '../../../src/components/kishufiya-guide/detect.js';

describe('tidyWhen', () => {
    test('asked and nothing dragged: now', () => {
        expect(tidyWhen(true, false)).toBe('now');
    });
    test('asked while a block is dragged: it waits for the drop', () => {
        expect(tidyWhen(true, true)).toBe('wait');
    });
    test('not asked: never, dragged or not', () => {
        expect(tidyWhen(false, false)).toBe('none');
        expect(tidyWhen(false, true)).toBe('none');
    });
});
