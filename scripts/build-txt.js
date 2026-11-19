// The BUILD.txt of this editor's build in the platform (public/kishufiya/BUILD.txt;
// the platform's scripts/check-editor-builds.mjs):
//   line 1:   `kishufiya <commit>, built YYYY-MM-DD HH:MM`
//   then:     `# draws: a, b` - the signs of a mark this build draws (scripts/draws.txt is the ONE list;
//             platform decision 0055, SPEC-editor-base section 13).
//             Same format as scratchjr-web's scripts/copy-to-platform.ps1.
// Use, after the build is copied into the platform's public/kishufiya:
//   node scripts/build-txt.js <platform>/public/kishufiya        (writes BUILD.txt there)
//   node scripts/build-txt.js                                    (prints it)
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');

// The names in draws.txt: one a line, blank lines and `#` comments skipped.
const drawsOf = text => text.split(/\r?\n/).map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));

const pad = n => String(n).padStart(2, '0');
const stamp = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`;

// The whole file, as its lines joined.
const buildTxt = (commit, date, draws) => {
    const lines = [`kishufiya ${commit}, built ${stamp(date)}`];
    if (draws.length) lines.push(`# draws: ${draws.join(', ')}`);
    return `${lines.join('\n')}\n`;
};

module.exports = {drawsOf, buildTxt, stamp};

if (require.main === module) {
    const root = path.join(__dirname, '..');
    const git = args => execFileSync('git', ['-C', root, ...args], {encoding: 'utf8'}).trim();
    if (git(['status', '--porcelain', '--untracked-files=no'])) {
        process.stderr.write('warning: kishufiya has uncommitted changes: the build is not of a commit\n');
    }
    const text = buildTxt(git(['rev-parse', '--short', 'HEAD']), new Date(),
        drawsOf(fs.readFileSync(path.join(__dirname, 'draws.txt'), 'utf8')));
    const target = process.argv[2];
    if (target) {
        fs.writeFileSync(path.join(target, 'BUILD.txt'), text);
        process.stdout.write(`${path.join(target, 'BUILD.txt')} written\n`);
    } else {
        process.stdout.write(text);
    }
}
