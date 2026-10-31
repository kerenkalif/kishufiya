// A point on the stage as a target (platform decision 28 stage 2, 2026-10-31): the pure math (detect.js) and resolve with a
// stand-in VM and document (the way look-targets.test.js stands in for the document).
//   npx jest test/unit/kishufiya-guide/stage-point
import {POINT_MARK, stagePointOf, stagePointOnScreen} from '../../../src/components/kishufiya-guide/detect.js';
import {resolve} from '../../../src/components/kishufiya-guide/targets.js';

const stage = {width: 480, height: 360};
// the canvas drawn at half size, at 100, 50
const canvas = {left: 100, top: 50, width: 240, height: 180, right: 340, bottom: 230};

describe('a point on the stage, on the screen', () => {
    test('the middle of the stage is the middle of the canvas; the mark is POINT_MARK wide around it', () => {
        const on = stagePointOnScreen({x: 0, y: 0, stage, canvas});
        expect(on.rect).toEqual({left: 220 - 14, right: 220 + 14, top: 140 - 14, bottom: 140 + 14});
        expect(on.rect.right - on.rect.left).toBe(POINT_MARK);
    });
    test('y goes up on the stage and down on the screen; x follows the canvas scale', () => {
        const on = stagePointOnScreen({x: 240, y: 180, stage, canvas});
        expect(on.rect.left + 14).toBe(340);
        expect(on.rect.top + 14).toBe(50);
        const low = stagePointOnScreen({x: -120, y: -90, stage, canvas});
        expect(low.rect.left + 14).toBe(100 + 60);
        expect(low.rect.top + 14).toBe(50 + 135);
    });
    test('the stage hidden comes first; a point outside the stage, or none, is off it', () => {
        expect(stagePointOnScreen({x: 0, y: 0, stage, canvas: null})).toEqual({missing: 'stage-hidden'});
        expect(stagePointOnScreen({x: 0, y: 0, stage, canvas: {left: 0, top: 0, width: 0, height: 0}})).toEqual({missing: 'stage-hidden'});
        expect(stagePointOnScreen({x: 241, y: 0, stage, canvas})).toEqual({missing: 'offstage'});
        expect(stagePointOnScreen({x: 0, y: -181, stage, canvas})).toEqual({missing: 'offstage'});
        expect(stagePointOnScreen({x: NaN, y: 0, stage, canvas})).toEqual({missing: 'offstage'});
    });
    test('a coordinate left out is the sprite\'s own; without the sprite there is no point', () => {
        expect(stagePointOf({y: 0}, {x: 37, y: -50})).toEqual({x: 37, y: 0});
        expect(stagePointOf({x: 10}, {x: 37, y: -50})).toEqual({x: 10, y: -50});
        expect(stagePointOf({x: 10, y: 20}, null)).toEqual({x: 10, y: 20});
        expect(stagePointOf({y: 0}, null)).toEqual({missing: 'sprite'});
        expect(stagePointOf({}, null)).toEqual({missing: 'sprite'});
        expect(stagePointOf(null, null)).toEqual({missing: 'sprite'});
    });
});

describe('resolve: a point on the stage', () => {
    const vm = {
        editingTarget: null,
        renderer: {canvas: {getBoundingClientRect: () => canvas}},
        runtime: {
            stageWidth: 480,
            stageHeight: 360,
            getSpriteTargetByName: name => (name === 'ship' ? {x: 40, y: -20} : null)
        }
    };
    beforeAll(() => {
        global.document = {querySelector: () => null, querySelectorAll: () => [], activeElement: null};
    });
    test('both numbers: the mark at that point, via stage-point', () => {
        expect(resolve({ui: 'stage', stagePoint: {x: 0, y: 0}}, vm))
            .toEqual({rect: {left: 206, right: 234, top: 126, bottom: 154}, via: 'stage-point'});
    });
    test('y alone: the sprite\'s x now, at that y', () => {
        const found = resolve({ui: 'stage', stagePoint: {y: 0, sprite: 'ship'}}, vm);
        expect(found.via).toBe('stage-point');
        expect(found.rect.left + 14).toBe(100 + ((40 + 240) / 2));
        expect(found.rect.top + 14).toBe(50 + 90);
    });
    test('a coordinate left out and no such sprite: missing sprite; a point off the stage: offstage', () => {
        expect(resolve({ui: 'stage', stagePoint: {y: 0, sprite: 'nobody'}}, vm)).toEqual({missing: 'sprite'});
        expect(resolve({ui: 'stage', stagePoint: {y: 0}}, vm)).toEqual({missing: 'sprite'});
        expect(resolve({ui: 'stage', stagePoint: {x: 300, y: 0}}, vm)).toEqual({missing: 'offstage'});
    });
    test('the stage hidden (no canvas on the screen): stage-hidden, as for a sprite on it', () => {
        const none = {left: 0, top: 0, width: 0, height: 0};
        const hidden = {...vm, renderer: {canvas: {getBoundingClientRect: () => none}}};
        expect(resolve({ui: 'stage', stagePoint: {x: 0, y: 0}}, hidden)).toEqual({missing: 'stage-hidden'});
    });
});
