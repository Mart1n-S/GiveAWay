// packages/ui/src/theme/tokens.ts

export const colors = {
    primary: {
        default: '#CC460F',
        hover: '#A6390C',
        active: '#7F2B09',
    },

    white: {
        default: '#FFFFFF',
        hover: '#FDF4F0',
        active: '#FBE8E1',
    },

    grey: {
        300: "#E5E7EB",
        600: "#9CA3AF",
        700: "#4B5563",
        800: "#1F2937",
        disabledText: '#4B5563',
    },

    focus: '#0F95CC',

    error: {
        strong: '#DC2626',
        soft: '#FEF2F2',
    },

    success: {
        strong: '#008037',
        soft: '#F4FBF6',
    },
};

export const radius = {
    md: 6,
};

export const sizing = {
    controlHeight: 44, // px — buttons, inputs, selects
};

export const typography = {
    fontFamily: 'Open Sans',
    baseFontSize: 16,
    lineHeight: 1.5,
    weight: {
        regular: 400,
        semibold: 600,
        bold: 700,
    },
};
