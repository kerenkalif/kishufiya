// כישופייה: library items a lesson's game brought (the platform's W18) keep their files on the platform,
// not on Scratch's asset server. The platform marks such an item `kishufiyaAsset: true` and serves its
// files at /api/kishufiya/asset/<md5>.<ext> (a library file needs no sign-in).
//
// Scratch independence is complete: every library file is asked of the platform only (ASSET_SOURCES below);
// the editor never contacts Scratch's asset servers.

const ours = new Set();

// Scratch independence (platform SPEC-scratch-independence): where a library file is asked for, in order.
// 'ours' is the platform's /api/kishufiya/asset/. (The 'scratch' fallback was removed 2026-10-30, after the
// whole library and every saved project were verified in the platform's store.)
export const ASSET_SOURCES = ['ours'];

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

// A library item's picture: [url, null]. The second slot stays so the callers keep their shape.
export const libraryIconUrls = md5ext => [ourAssetUrl(md5ext), null];
