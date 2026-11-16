// The menus open over the code area, told to the page as part of code-area `avoid` so its bubble stands off them: a
// variable's, a message's, a sprite's (touching), a sound's, an effect's, a key's menu is a dropdown, and the number pad
// and the colour picker are field editors, all drawn over the blocks. A bubble placed on the block that opened one covered
// the very choice the child had to make (donuts "בוחרים ניקוד", 2026-11-17). Pure: the document in, boxes out.
export const OPEN_MENU_SELECTORS = ['.blocklyDropDownDiv', '.blocklyWidgetDiv', '.blocklyContextMenu'];

const whole = r => ({left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height)});

// Every menu that is open now (it has a size on the page), as {left, top, width, height} in the page's pixels. A closed one
// has none (display none), so the bubble goes back to its place when the menu closes.
export const openMenuRects = doc => {
    const rects = [];
    for (const selector of OPEN_MENU_SELECTORS) {
        for (const el of Array.from(doc.querySelectorAll(selector))) {
            const r = el.getBoundingClientRect();
            if (r && r.width > 0 && r.height > 0) rects.push(whole(r));
        }
    }
    return rects;
};
