// library-pick (picks.js, platform auto-root 2026-10-28): what the child adds, told before it is in; a deleted
// sprite brought back is no pick.
//   npx jest test/unit/kishufiya-guide
import {watchPicks} from '../../../src/components/kishufiya-guide/picks.js';

// A vm with the add methods as scratch-vm has them: addCostumeFromLibrary adds through this.addCostume, and
// deleteSprite's restore through this.addSprite, later.
const fakeVm = () => {
    const stage = {isStage: true};
    const sprite = {isStage: false};
    const order = [];
    const vm = {
        order,
        runtime: {getTargetById: id => (id === 'stage' ? stage : sprite)},
        editingTarget: sprite,
        addSprite (input) {
            order.push('add');
            return Promise.resolve(input);
        },
        addCostume (md5ext) {
            order.push('add');
            return Promise.resolve(md5ext);
        },
        addCostumeFromLibrary (md5ext, costume) {
            return this.addCostume(md5ext, costume, 'sprite');
        },
        addBackdrop () {
            order.push('add');
            return Promise.resolve();
        },
        addSound () {
            order.push('add');
            return Promise.resolve();
        },
        deleteSprite () {
            return () => Promise.resolve(new ArrayBuffer(8)).then(buffer => this.addSprite(buffer));
        }
    };
    return vm;
};
const watched = () => {
    const vm = fakeVm();
    const told = [];
    watchPicks(vm, msg => {
        vm.order.push('tell');
        told.push(msg);
    });
    return {vm, told};
};

describe('library-pick', () => {
    test('a library sprite, the brush, a file - each told with where it came from', () => {
        const {vm, told} = watched();
        vm.addSprite(JSON.stringify({name: 'Frog', tags: ['animals'], costumes: [{md5ext: 'abc.svg'}]}));
        vm.addSprite(JSON.stringify({objName: 'Sprite1', costumes: [{baseLayerMD5: 'cd21514d0531fdffb22204e0ec5ed84a.svg'}]}));
        vm.addSprite(JSON.stringify({name: 'photo', costumes: [{md5: 'fff.png'}]}));
        vm.addSprite(new ArrayBuffer(4));
        expect(told).toEqual([
            {type: 'library-pick', kind: 'sprite', source: 'library', name: 'Frog', asset: 'abc'},
            {type: 'library-pick', kind: 'sprite', source: 'paint', name: 'Sprite1', asset: 'cd21514d0531fdffb22204e0ec5ed84a'},
            {type: 'library-pick', kind: 'sprite', source: 'upload', name: 'photo', asset: 'fff'},
            {type: 'library-pick', kind: 'sprite', source: 'upload', name: '', asset: null}
        ]);
    });
    test('told before the add, in the same tick: before any game that holds it', () => {
        const {vm} = watched();
        vm.addSprite(JSON.stringify({name: 'Frog', tags: [], costumes: [{md5ext: 'abc.svg'}]}));
        expect(vm.order).toEqual(['tell', 'add']);
    });
    test('a library costume is told once, as a library one; a backdrop on the stage is a backdrop', () => {
        const {vm, told} = watched();
        vm.addCostumeFromLibrary('abc.svg', {name: 'frog2'});
        vm.addCostume('cd21514d0531fdffb22204e0ec5ed84a.svg', {name: 'costume2'}, 'sprite');
        vm.addCostume('def.png', {name: 'mine', asset: {}}, 'stage');
        expect(told.map(t => [t.kind, t.source, t.asset])).toEqual([
            ['costume', 'library', 'abc'],
            ['costume', 'paint', 'cd21514d0531fdffb22204e0ec5ed84a'],
            ['backdrop', 'upload', 'def']
        ]);
    });
    test('a deleted sprite brought back is no pick; a sprite file after it is', async () => {
        const {vm, told} = watched();
        const restore = vm.deleteSprite('sprite');
        await restore();
        expect(told).toEqual([]);
        vm.addSprite(new ArrayBuffer(4));
        expect(told.map(t => t.source)).toEqual(['upload']);
    });
    test('a restore that never brings the sprite back does not swallow a later file', async () => {
        const vm = fakeVm();
        vm.deleteSprite = () => () => Promise.reject(new Error('no zip'));
        const told = [];
        watchPicks(vm, msg => told.push(msg));
        await vm.deleteSprite('sprite')().catch(() => {});
        vm.addSprite(new ArrayBuffer(4));
        expect(told.map(t => t.source)).toEqual(['upload']);
    });
});
