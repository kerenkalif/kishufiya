/**
 * Guard (platform SPEC-scratch-independence 5): the editor must not talk to Scratch's servers.
 * Fails when a file under src/ names a scratch.mit.edu address and is not on the allowlist of
 * files that only carry credits, text or links the child may click (never fetched by the page).
 * Also fails on turbowarp.org / turbowarp.xyz hosts outside the credits.
 * Run: npm run test:no-scratch
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const PATTERN = /scratch\.mit\.edu/i;

// Files (or folders, ending in /) that may mention scratch.mit.edu. Links and credits only.
// Anything that fetches (api., projects., assets., cdn., clouddata., *-service., speech.) must not be here.
const ALLOW = [
    'src/addons/', // add-on manifests: "matches" patterns and credit links
    'src/playground/credits/',
    'src/playground/index.ejs', // error splash: link to report
    'src/playground/render-interface.jsx', // footer credit links
    'src/components/menu-bar/author-info.jsx', // link
    'src/components/menu-bar/menu-bar.jsx', // link
    'src/components/telemetry-modal/telemetry-modal.jsx',
    'src/components/tw-description/description.jsx',
    'src/components/tw-featured-projects/featured-projects.jsx',
    'src/components/tw-invalid-embed/invalid-embed.jsx',
    'src/components/tw-project-input/project-input.jsx',
    'src/components/tw-studioview/studioview.js',
    'src/components/webgl-modal/webgl-modal.jsx',
    'src/lib/alerts/index.jsx', // link
    'src/lib/libraries/extensions/index.jsx', // helpLink
    'src/lib/default-project/' // credit comments inside the art
];
// Even in an allowed file, an address like these is a request, never a link.
// eslint-disable-next-line max-len
const FETCHED = /(api|projects|assets|uploads|cdn2?|cdn\.assets|cdn\.projects|clouddata|synthesis-service|translate-service|speech|device-manager)\.scratch\.mit\.edu/i;

// TurboWarp disconnect (platform SPEC-scratch-independence 7): no turbowarp.org / turbowarp.xyz host anywhere in
// src/ except the credits (a license obligation: the credit link to TurboWarp stays).
const TW_PATTERN = /turbowarp\.(org|xyz)/i;
const TW_ALLOW = [
    'src/playground/credits/credits.jsx' // "based on TurboWarp" credit link
];
// Translations of the interface strings are text only (the upstream strings that name the gallery are never shown).
const TW_SKIP = ['src/lib/tw-translations/'];

const bad = [];
const walk = dir => {
    for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            walk(full);
        } else if (/\.(js|jsx|ts|tsx|json|ejs|html|svg|md)$/.test(name)) {
            const rel = path.relative(path.join(__dirname, '..'), full).split(path.sep)
                .join('/');
            // translations of the add-ons' interface strings are text only
            if (rel.includes('/addons-l10n')) continue;
            const text = fs.readFileSync(full, 'utf8');
            if (TW_PATTERN.test(text) && !TW_ALLOW.includes(rel) && !TW_SKIP.some(s => rel.startsWith(s))) {
                bad.push(`${rel}: a turbowarp.org host outside the credits`);
            }
            if (!PATTERN.test(text)) continue;
            const allowed = ALLOW.some(a => (a.endsWith('/') ? rel.startsWith(a) : rel === a));
            if (!allowed) bad.push(`${rel}: scratch.mit.edu outside the allowlist`);
            else if (FETCHED.test(text)) bad.push(`${rel}: a Scratch service host`);
        }
    }
};
walk(SRC);

if (bad.length) {
    console.error('no-scratch-hosts: FAILED');
    bad.forEach(b => console.error(`  ${b}`));
    process.exit(1);
}
console.log('no-scratch-hosts: ok');
