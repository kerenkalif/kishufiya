//   npx jest test/unit/kishufiya-menus/layers
import fs from 'fs';
import path from 'path';
import {registerLayer, layerIsOpen, onLayersChange, isOwn} from '../../../src/lib/kishufiya-showing.js';

describe('layers that replace the editor', () => {
    test('registered while open, gone after unregister; tells listeners', () => {
        let calls = 0;
        const off = onLayersChange(() => calls++);
        expect(layerIsOpen()).toBe(false);
        const a = registerLayer();
        const b = registerLayer();
        expect(layerIsOpen()).toBe(true);
        expect(isOwn({foreignProject: false, replacedByLayer: layerIsOpen()})).toBe(false);
        a();
        expect(layerIsOpen()).toBe(true);
        b();
        expect(layerIsOpen()).toBe(false);
        expect(calls).toBe(4);
        off();
    });

    test('the wrapper registers on mount and unregisters on unmount', () => {
        const src = fs.readFileSync(path.join(__dirname, '../../../src/components/kishufiya-layer/full-screen-layer.jsx'), 'utf8');
        expect(src).toMatch(/useEffect\(\(\) => registerLayer\(\), \[\]\)/);
    });

    test('every full-screen layer of the editor goes through FullScreenLayer', () => {
        const root = path.join(__dirname, '../../../src/components');
        const offenders = [];
        for (const dir of fs.readdirSync(root).filter(d => d.startsWith('kishufiya-') && d !== 'kishufiya-layer')) {
            for (const file of fs.readdirSync(path.join(root, dir)).filter(f => f.endsWith('.jsx'))) {
                const src = fs.readFileSync(path.join(root, dir, file), 'utf8');
                if (/<Modal[^>]*\bfullScreen\b/.test(src) && !src.includes('FullScreenLayer')) {
                    offenders.push(`${dir}/${file}`);
                }
            }
        }
        // the only users of a full-screen layer are rendered inside the wrapper by their host (kishufiya.jsx)
        const host = fs.readFileSync(path.join(__dirname, '../../../src/playground/kishufiya.jsx'), 'utf8');
        const unwrapped = offenders.filter(o => {
            const name = path.basename(o, '.jsx').split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('');
            return !new RegExp(`<FullScreenLayer>\\s*<${name}\\b`).test(host);
        });
        expect(unwrapped).toEqual([]);
    });
});
