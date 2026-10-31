/**
 * Guard: the sanitizer that protects the editor from a child's SVG must be a fixed version in what is actually
 * built, whichever node_modules the build happened to use. Fails when a bundle holds an older dompurify, or none.
 * Run after a build: npm run test:bundle-versions [-- <folder of the built js>]
 */
const fs = require('fs');
const path = require('path');

const MIN = [3, 4, 17];
const dir = process.argv[2] || path.join(__dirname, '..', 'build', 'js');
const VERSION = /DOMPurify\.version\s*=\s*["'](\d+)\.(\d+)\.(\d+)/g;

const older = v => {
    for (let i = 0; i < MIN.length; i++) {
        if (v[i] !== MIN[i]) return v[i] < MIN[i];
    }
    return false;
};

if (!fs.existsSync(dir)) {
    console.error(`bundle-versions: FAILED, no build at ${dir}`);
    process.exit(1);
}
const found = new Set();
const bad = [];
for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.js')) continue;
    const text = fs.readFileSync(path.join(dir, name), 'utf8');
    for (const m of text.matchAll(VERSION)) {
        const v = [Number(m[1]), Number(m[2]), Number(m[3])];
        found.add(v.join('.'));
        if (older(v)) bad.push(`${name}: dompurify ${v.join('.')}`);
    }
}
if (bad.length || !found.size) {
    console.error(`bundle-versions: FAILED, dompurify must be ${MIN.join('.')} or later`);
    bad.forEach(b => console.error(`  ${b}`));
    if (!found.size) console.error('  no dompurify found in the bundles');
    process.exit(1);
}
console.log(`bundle-versions: ok (dompurify ${[...found].join(', ')})`);
