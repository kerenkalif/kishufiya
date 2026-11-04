// "קסם הקוד" brand accent for הכישופייה: teal (#009999 / #007373) with the brand's yellow for highlights.
// The menu bar's fill. White text on #009999 is 3.5:1 (WCAG AA needs 4.5:1); #007373 is 5.7:1. Keren chose the dark teal
// (4.11). This one line is the switch: MENU_BAR_TEAL brings back the brand teal.
const MENU_BAR_TEAL = '#009999';
const MENU_BAR_TEAL_DARK = '#007373';
const MENU_BAR_BACKGROUND = MENU_BAR_TEAL_DARK;

const guiColors = {
    'menu-bar-background': MENU_BAR_BACKGROUND,
    // The project-name field sits on the bar: a dark fill keeps its white text above 4.5:1 on either teal.
    'project-title-inactive': 'rgba(0, 0, 0, 0.3)',
    'project-title-hover': 'rgba(0, 0, 0, 0.4)',

    'motion-primary': '#009999',
    'motion-primary-transparent': '#009999e6',
    'motion-tertiary': '#007373',

    'looks-secondary': '#009999',
    'looks-transparent': '#00999959',
    'looks-light-transparent': '#00999926',
    'looks-secondary-dark': '#007373',

    'extensions-primary': 'hsla(180, 100%, 30%, 1)',
    'extensions-tertiary': 'hsla(180, 100%, 22%, 1)',
    'extensions-transparent': 'hsla(180, 100%, 30%, 0.35)',
    'extensions-light': 'hsla(180, 45%, 85%, 1)',

    'drop-highlight': '#ffd54f'
};

const blockColors = {
    checkboxActiveBackground: '#009999',
    checkboxActiveBorder: '#007373'
};

export {
    guiColors,
    blockColors
};
