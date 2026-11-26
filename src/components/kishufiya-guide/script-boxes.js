// The open sprite's top-level scripts as boxes in workspace units, told to the lesson page as {type: 'script-boxes'} so it can
// say "the scripts lie on each other" (platform SPEC-lesson-flow decision 64, health item "overlap"): the page cannot know a
// script's size (the project file has none), only the editor does. Pure: blocks in, boxes out (test/unit/kishufiya-guide).
// `blocks`: the workspace's top blocks, each {id, xy: {x, y} (getRelativeToSurfaceXY), size: {width, height} (getHeightWidth)}.
// x is always the LEFT edge: in right-to-left a block's own x is its right edge, the box reaches to the left of it.
const round = n => Math.round(n * 10) / 10;

export const scriptBoxes = (blocks, rtl) => blocks.map(block => ({
    id: block.id,
    x: round(rtl ? block.xy.x - block.size.width : block.xy.x),
    y: round(block.xy.y),
    w: round(block.size.width),
    h: round(block.size.height)
}));

// What the editor reads from a workspace's top blocks (not ordered: the page does not depend on order).
export const topBlocksOf = workspace => workspace.getTopBlocks(false).map(block => ({
    id: block.id,
    xy: block.getRelativeToSurfaceXY(),
    size: block.getHeightWidth()
}));
