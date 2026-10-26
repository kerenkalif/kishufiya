// כישופייה: library items a lesson's game brought (the platform's W18) keep their files on the platform,
// not on Scratch's asset server. The platform marks such an item `kishufiyaAsset: true` and serves its
// files, to anyone signed in, at /api/kishufiya/asset/<md5>.<ext>.
//
// The files of every such item the library sent are remembered here, so storage asks the platform for them
// straight away instead of first asking Scratch's server (a 404 there, asked twice: the worker, then fetch).
// Any other file still goes to Scratch first, with the platform as the fallback.

const ours = new Set();

// The platform's address for a file: absolute, since storage may fetch it from a worker.
export const ourAssetUrl = md5ext => `${location.origin}/api/kishufiya/asset/${md5ext}`;

export const isOurAsset = md5ext => ours.has(md5ext);

const md5extOf = asset => asset.md5ext || (asset.assetId && asset.dataFormat ?
    `${asset.assetId}.${asset.dataFormat}` :
    null);

// Remember the files of the library's own items (a sprite's costumes and sounds, or a costume/backdrop).
export const rememberOurAssets = items => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
        if (!item || !item.kishufiyaAsset) continue;
        const assets = item.costumes || item.sounds ?
            [...(item.costumes || []), ...(item.sounds || [])] :
            [item];
        for (const asset of assets) {
            const name = md5extOf(asset);
            if (name) ours.add(name);
        }
    }
};
