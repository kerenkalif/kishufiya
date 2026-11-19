// The BUILD.txt of the editor's build in the platform (scripts/build-txt.js): the commit line, then the signs it draws.
//   npx jest test/unit/scripts/build-txt
import fs from 'fs';
import path from 'path';
const {drawsOf, buildTxt} = require('../../../scripts/build-txt.js');

describe('build-txt', () => {
    test('the draws are the names of draws.txt, comments and blank lines skipped', () => {
        expect(drawsOf('# a comment\n\nvalue\r\n  key  \n')).toEqual(['value', 'key']);
        expect(drawsOf(fs.readFileSync(path.join(__dirname, '../../../scripts/draws.txt'), 'utf8'))).toEqual(['value']);
    });
    test('the file: the commit and the time, then the draws', () => {
        const date = new Date(2026, 10, 19, 7, 5);
        expect(buildTxt('87e13ec', date, ['value'])).toBe('kishufiya 87e13ec, built 2026-11-19 07:05\n# draws: value\n');
        expect(buildTxt('87e13ec', date, ['press', 'value'])).toContain('# draws: press, value');
    });
    test('a build that draws no sign says none', () => {
        expect(buildTxt('87e13ec', new Date(2026, 10, 19, 7, 5), [])).toBe('kishufiya 87e13ec, built 2026-11-19 07:05\n');
    });
});
