import PropTypes from 'prop-types';
import {useEffect} from 'react';

// כישופייה: the selected sprite's faint picture in the code area's corner sits BEHIND the blocks (Keren,
// 2026-10-24) - an image over the blocks hid the script a child put in that corner. It is drawn inside the
// workspace's own SVG, between its dotted background and its blocks, at the same corner as before; it
// stays there when the code scrolls, since it is outside the layer that scrolls.
const SIZE = 48;
const MARGIN = 20;
const IMAGE_CLASS = 'kishufiya-watermark';

const place = url => {
    const svg = document.querySelector('.injectionDiv > svg.blocklySvg');
    const background = svg && svg.querySelector(':scope > g.blocklyWorkspace > rect.blocklyMainBackground');
    if (!svg || !background) return false;
    let image = background.parentNode.querySelector(`:scope > image.${IMAGE_CLASS}`);
    if (!url) {
        if (image) image.remove();
        return true;
    }
    if (!image) {
        image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        image.setAttribute('class', IMAGE_CLASS);
        image.setAttribute('width', SIZE);
        image.setAttribute('height', SIZE);
        image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        image.setAttribute('opacity', '0.35');
        image.setAttribute('pointer-events', 'none');
        background.after(image);
    }
    // Where it always stood: gui.css still places the (now empty) watermark box in the code area's corner,
    // left in Hebrew, right in English. The workspace SVG itself is marked ltr, so its direction says nothing.
    const box = document.querySelector('[class*="gui_watermark"]');
    const at = svg.getBoundingClientRect();
    const corner = box && box.getBoundingClientRect();
    const rtl = Boolean(box && box.closest('[dir="rtl"]'));
    const x = corner ? corner.left - at.left - (rtl ? 0 : SIZE) : MARGIN;
    image.setAttribute('x', Math.max(0, x));
    image.setAttribute('y', corner ? Math.max(0, corner.top - at.top) : MARGIN);
    image.setAttribute('href', url);
    return true;
};

const Watermark = ({costumeURL}) => {
    useEffect(() => {
        // The workspace may not be in the page yet on the first render.
        let tries = 0;
        let timer = null;
        const tryPlace = () => {
            if (!place(costumeURL) && tries++ < 50) timer = setTimeout(tryPlace, 100);
        };
        tryPlace();
        const onResize = () => place(costumeURL);
        window.addEventListener('resize', onResize);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', onResize);
        };
    }, [costumeURL]);
    useEffect(() => () => place(null), []);
    // Nothing of its own over the code area any more.
    return null;
};

Watermark.propTypes = {
    costumeURL: PropTypes.string
};

export default Watermark;
