// The open sprite's top-level scripts as the own rectangles of their blocks in workspace units, told to the lesson page as
// {type: 'script-boxes'} so it can say "the scripts lie on each other" (platform SPEC-lesson-flow decision 64, health item "overlap"):
// the page cannot know a block's size (the project file has none), only the editor does. A script is NOT one box: a narrow hat over a
// wide lower part would count as covering what lies beside the hat. Each block gives its own body (width/height without the blocks
// stacked under it or nested in it, which have their own rects); the judging is the platform's (script-overlap.ts), the editor gives data.
// Pure: blocks in, boxes out (test/unit/kishufiya-guide).
// `blocks`: the workspace's top blocks, each {id, parts: [{xy: {x, y} (getRelativeToSurfaceXY), size: {width, height}}]}, one part per
// block of the script. x is always the LEFT edge: in right-to-left a block's own x is its right edge, the rect reaches to the left of it.
const round = n => Math.round(n * 10) / 10;

export const scriptBoxes = (blocks, rtl) => blocks.map(block => ({
    id: block.id,
    rects: block.parts.map(part => ({
        x: round(rtl ? part.xy.x - part.size.width : part.xy.x),
        y: round(part.xy.y),
        w: round(part.size.width),
        h: round(part.size.height)
    }))
}));

// A block's own body: its width and height are the rendered shape's (a C block's includes its mouth, not what is stacked under it).
const partOf = block => ({
    xy: block.getRelativeToSurfaceXY(),
    size: {width: block.width, height: block.height}
});

// What the editor reads from a workspace's top blocks (not ordered: the page does not depend on order). Shadows (the round fields inside
// a block) are not blocks of the script.
export const topBlocksOf = workspace => workspace.getTopBlocks(false).map(block => ({
    id: block.id,
    parts: block.getDescendants(false).filter(one => !one.isShadow()).map(partOf)
}));
