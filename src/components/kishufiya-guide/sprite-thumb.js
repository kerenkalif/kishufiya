// The sprite's small picture for the lesson's strip (SPEC-editor-base 15.2: `editing` {sprite, thumb}): the open sprite's current costume drawn into a small square and said as a
// png data URL. Costume pixels only - nothing of the child's own (no name, no game). The platform keeps a picture only if it is a raster data URL of at most MAX_CHARS characters
// (platform src/lib/limits.ts SPRITE_THUMB_MAX_CHARS: change the two together); a picture that comes out longer is not said.
export const SPRITE_THUMB_PX = 56;
export const SPRITE_THUMB_MAX_CHARS = 24000;

// The box the costume is drawn in, inside size x size, its proportions kept. -> {width, height}, whole px, at least 1.
export const thumbBox = (width, height, size = SPRITE_THUMB_PX) => {
    if (!(width > 0) || !(height > 0)) return {width: size, height: size};
    const scale = Math.min(size / width, size / height);
    return {width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale))};
};

// The picture to say: a raster data URL not longer than the limit, else null.
export const sayable = (url, max = SPRITE_THUMB_MAX_CHARS) =>
    typeof url === 'string' && url.length <= max && /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(url) ? url : null;

const made = new Map(); // costume asset id -> the picture said for it (or null: none could be made), so a sprite opened again says it at once

const draw = url => new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
        const box = thumbBox(image.naturalWidth || image.width, image.naturalHeight || image.height);
        const canvas = document.createElement('canvas');
        canvas.width = box.width;
        canvas.height = box.height;
        const context = canvas.getContext('2d');
        if (!context) return resolve(null);
        context.drawImage(image, 0, 0, box.width, box.height);
        try {
            resolve(sayable(canvas.toDataURL('image/png')) || sayable(canvas.toDataURL('image/webp', 0.8)));
        } catch (e) { // a picture the canvas will not give back: none
            resolve(null);
        }
    };
    image.onerror = () => resolve(null);
    image.src = url;
});

// The picture of the sprite's current costume (target: a scratch-vm target; the stage too; `urlOf`: the editor's own costume-to-URL, lib/get-costume-url, handed in so this file stays free of the
// editor's storage). Never rejects.
export const thumbFor = async (target, urlOf) => {
    try {
        const costume = target && target.getCurrentCostume && target.getCurrentCostume();
        const asset = costume && costume.asset;
        if (!asset) return null;
        const id = asset.assetId;
        if (made.has(id)) return made.get(id);
        const thumb = await draw(urlOf(asset));
        made.set(id, thumb);
        return thumb;
    } catch (e) { // ignored: no picture is no harm, the strip draws the name alone
        return null;
    }
};

// The teller of `editing`: said at once on every switch, in the order of the switches (the sprite's opening is what the lesson waits for); the picture follows in a second `editing` of the
// same sprite when it is ready, and only if that sprite is still the one open (a sequence counter: a late picture of a sprite left meanwhile is dropped, never said after the next one's name).
export const makeEditingTeller = (send, thumbOf) => {
    let seq = 0;
    return target => {
        const mine = ++seq;
        const name = target.getName();
        send({type: 'editing', sprite: name});
        thumbOf(target).then(thumb => {
            if (mine === seq && thumb) send({type: 'editing', sprite: name, thumb});
        }, () => {}); // ignored: no picture is no harm, thumbFor never rejects
    };
};
