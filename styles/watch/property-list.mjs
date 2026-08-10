/*
 * Example classes:
 *
 * text:center
 * text:color:red
 * padding:1.2rem
 * padding:left:1.5rem
 * margin:top:20px
 * width:50%
 *
 * Dimensional values always include an encoded or CSS unit:
 * width:50% -> 50%
 * padding:1.2rem -> 1.2rem
 * padding:12.5% -> 12.5%
 */

const LEGACY_COLORS = {
    blue: "#007cc7",
    red: "#bb1414",
    yellow: "#ffab1a",
    black: "#1b2020",
    grey: "#c8cdd0",
    darkgrey: "#415058",
    lime: "#7ed321",
    teal: "teal",
    primary: "#0d6efd",
    secondary: "#6c757d",
    success: "#198754",
    danger: "#dc3545",
    warning: "#ffc107",
    info: "#0dcaf0",
    white: "#ffffff",
    "gray-100": "#f8f9fa",
    "gray-200": "#e9ecef",
    "gray-300": "#dee2e6",
    "gray-400": "#ced4da",
    "gray-500": "#adb5bd",
    "gray-600": "#6c757d",
    "gray-700": "#495057",
    "gray-800": "#343a40",
    "gray-900": "#212529",
    "pitch-black": "#000000",
    orange: "#fd7e14",
    cyan: "#17a2b8",
    indigo: "#6610f2",
    purple: "#6f42c1",
    pink: "#d63384",
    "pastel-pink": "#ffb3c6",
    "pastel-green": "#b8e994",
    "pastel-blue": "#a3c9f9",
    "pastel-yellow": "#fff3b0",
    "pastel-purple": "#d4a5f9",
    navy: "#001f3f",
    maroon: "maroon",
    olive: "#556b2f",
    brown: "#8b4513",
    gold: "gold",
    silver: "silver"
};

function colorUtilities(property) {
    return Object.fromEntries(
        Object.entries(LEGACY_COLORS).map(([name, value]) => [name, { [property]: value }])
    );
}

export const CHECK_CSS_PROPERTIES = {
    // Sizing
    width: { $: { width: "@" } },
    height: { $: { height: "@" } },

    "min-width": { $: { minWidth: "@" } },
    "min-height": { $: { minHeight: "@" } },
    "max-width": { $: { maxWidth: "@" } },
    "max-height": { $: { maxHeight: "@" } },

    w: {
        $: { width: "@" },
        sm: { width: "320px" },
        med: { width: "512px" },
        lg: { width: "800px" },
        xl: { width: "1024px" },
        xxl: { width: "1280px" }
    },
    h: { $: { height: "@" } },
    minw: { $: { minWidth: "@" } },
    minh: { $: { minHeight: "@" } },
    maxw: {
        $: { maxWidth: "@" },
        sm: { maxWidth: "320px" },
        med: { maxWidth: "512px" },
        lg: { maxWidth: "800px" },
        xl: { maxWidth: "1024px" },
        xxl: { maxWidth: "1280px" }
    },
    maxh: { $: { maxHeight: "@" } },

    // Position
    position: { $: { position: "@" } },

    static: { position: "static" },
    relative: { position: "relative" },
    absolute: { position: "absolute" },
    fixed: { position: "fixed" },
    sticky: { position: "sticky" },

    top: { $: { top: "@" } },
    right: { $: { right: "@" } },
    bottom: { $: { bottom: "@" } },
    left: { $: { left: "@" } },
    inset: { $: { inset: "@" } },

    z: { $: { zIndex: "@" } },

    // Margin
    margin: {
        $: { margin: "@" },

        top: { $: { marginTop: "@" } },
        right: { $: { marginRight: "@" } },
        bottom: { $: { marginBottom: "@" } },
        left: { $: { marginLeft: "@" } },

        x: {
            $: {
                marginLeft: "@",
                marginRight: "@"
            }
        },

        y: {
            $: {
                marginTop: "@",
                marginBottom: "@"
            }
        }
    },

    // Padding
    padding: {
        $: { padding: "@" },

        top: { $: { paddingTop: "@" } },
        right: { $: { paddingRight: "@" } },
        bottom: { $: { paddingBottom: "@" } },
        left: { $: { paddingLeft: "@" } },

        x: {
            $: {
                paddingLeft: "@",
                paddingRight: "@"
            }
        },

        y: {
            $: {
                paddingTop: "@",
                paddingBottom: "@"
            }
        }
    },

    // Display
    display: { $: { display: "@" } },

    block: { display: "block" },
    inline: { display: "inline" },
    "inline-block": { display: "inline-block" },
    "inline-flex": { display: "inline-flex" },
    "inline-grid": { display: "inline-grid" },
    table: { display: "table" },
    "inline-table": { display: "inline-table" },
    hidden: { display: "none" },
    "no-decoration": { textDecoration: "none" },

    // Flexbox
    flex: {
        $self: { display: "flex" },
        display: { display: "flex" },
        inline: { display: "inline-flex" },

        value: { $: { flex: "@" } },
        direction: { $: { flexDirection: "@" } },
        grow: { $self: { flex: "1 0 auto" }, $: { flexGrow: "@" } },
        shrink: { $self: { flex: "0 1 auto" }, $: { flexShrink: "@" } },
        all: { flex: "1 1 100%" },
        static: { flex: "0 0 auto" },
        basis: { $: { flexBasis: "@" } },

        row: { position: "relative", display: "flex", flexDirection: "row", flexWrap: "nowrap" },
        column: { position: "relative", display: "flex", flexDirection: "column" },
        wrap: { flexWrap: "wrap" },
        nowrap: { flexWrap: "nowrap" }
    },

    justify: {
        value: { $: { justifyContent: "@" } },
        start: { justifyContent: "flex-start" },
        center: { justifyContent: "center" },
        end: { justifyContent: "flex-end" },
        between: { justifyContent: "space-between" },
        around: { justifyContent: "space-around" },
        evenly: { justifyContent: "space-evenly" }
    },

    items: {
        value: { $: { alignItems: "@" } },
        start: { alignItems: "flex-start" },
        center: { alignItems: "center" },
        end: { alignItems: "flex-end" },
        stretch: { alignItems: "stretch" },
        baseline: { alignItems: "baseline" }
    },

    self: {
        value: { $: { alignSelf: "@" } },
        auto: { alignSelf: "auto" },
        start: { alignSelf: "flex-start" },
        center: { alignSelf: "center" },
        end: { alignSelf: "flex-end" },
        stretch: { alignSelf: "stretch" }
    },

    gap: {
        $: { gap: "@" },
        row: { $: { rowGap: "@" } },
        column: { $: { columnGap: "@" } }
    },

    // Grid
    grid: {
        $self: { display: "grid" },
        display: { display: "grid" },
        inline: { display: "inline-grid" },
        columns: { $: { gridTemplateColumns: "@" } },
        rows: { $: { gridTemplateRows: "@" } },
        column: { $: { gridColumn: "@" } },
        row: { $: { gridRow: "@" } },
        area: { $: { gridArea: "@" } }
    },

    // Font
    font: {
        $: { font: "@" },
        family: { $: { fontFamily: "@" } },
        size: { $: { fontSize: "@" } },
        weight: { $: { fontWeight: "@" } },
        style: { $: { fontStyle: "@" } }
    },
    "font-size": { $: { fontSize: "@" } },

    bold: { fontWeight: "bold" },
    italic: { fontStyle: "italic" },
    underline: { textDecoration: "underline" },

    // Text
    text: {
        ...colorUtilities("color"),
        uppercase: { textTransform: "uppercase" },
        lowercase: { textTransform: "lowercase" },
        capitalize: { textTransform: "capitalize" },
        none: { textTransform: "none" },
        nowrap: { whiteSpace: "nowrap" },
        "break-all": { wordBreak: "break-all" },
        upper: { textTransform: "uppercase" },
        lower: { textTransform: "lowercase" },
        capital: { textTransform: "capitalize" },
        normal: { textTransform: "none" },

        center: { textAlign: "center" },
        left: { textAlign: "left" },
        right: { textAlign: "right" },
        justify: { textAlign: "justify" },

        color: { $: { color: "@" } },
        size: { $: { fontSize: "@" } },
        decoration: { $: { textDecoration: "@" } },
        indent: { $: { textIndent: "@" } },
        overflow: { $: { textOverflow: "@" } },
        shadow: { $: { textShadow: "@" } }
    },

    leading: { $: { lineHeight: "@" } },
    tracking: { $: { letterSpacing: "@" } },

    // Background
    bg: {
        ...colorUtilities("backgroundColor"),
        $: { background: "@" },
        color: { $: { backgroundColor: "@" } },
        image: { $: { backgroundImage: "@" } },
        size: { $: { backgroundSize: "@" } },
        position: { $: { backgroundPosition: "@" } },
        repeat: { $: { backgroundRepeat: "@" } },
        attachment: { $: { backgroundAttachment: "@" } }
    },

    // Border
    border: {
        ...colorUtilities("borderColor"),
        $: { border: "@" },
        width: { $: { borderWidth: "@" } },
        style: { $: { borderStyle: "@" } },
        color: { $: { borderColor: "@" } },

        top: { $: { borderTop: "@" } },
        right: { $: { borderRight: "@" } },
        bottom: { $: { borderBottom: "@" } },
        left: { $: { borderLeft: "@" } }
    },

    radius: {
        $: { borderRadius: "@" },
        "top-left": { $: { borderTopLeftRadius: "@" } },
        "top-right": { $: { borderTopRightRadius: "@" } },
        "bottom-right": { $: { borderBottomRightRadius: "@" } },
        "bottom-left": { $: { borderBottomLeftRadius: "@" } }
    },

    // Overflow
    overflow: {
        $: { overflow: "@" },
        x: { $: { overflowX: "@" } },
        y: { $: { overflowY: "@" } },

        hidden: { overflow: "hidden" },
        auto: { overflow: "auto" },
        scroll: { overflow: "scroll" },
        visible: { overflow: "visible" }
    },

    // Visual
    opacity: { $: { opacity: "@" } },
    shadow: { $: { boxShadow: "@" } },
    cursor: { $: { cursor: "@" } },
    visibility: { $: { visibility: "@" } },

    "object-fit": { $: { objectFit: "@" } },
    "object-position": { $: { objectPosition: "@" } },

    // Transform
    transform: { $: { transform: "@" } },
    rotate: { $: { transform: "rotate(@)" } },
    scale: { $: { transform: "scale(@)" } },
    translate: { $: { transform: "translate(@)" } },

    // Animation
    transition: { $: { transition: "@" } },
    animation: { $: { animation: "@" } },

    // Miscellaneous
    order: { $: { order: "@" } },
    resize: { $: { resize: "@" } },
    content: { $: { content: "@" } },
    "pointer-events": { $: { pointerEvents: "@" } },
    "user-select": { $: { userSelect: "@" } },
    "white-space": { $: { whiteSpace: "@" } },
    "word-break": { $: { wordBreak: "@" } },
    "box-sizing": { $: { boxSizing: "@" } }
    ,
    row: {
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        width: "100%"
    }
};

/*
 * These properties accept unitless numeric values. Dimensional properties
 * require the unit to be present in the class value.
 */
export const UNITLESS_PROPERTIES = new Set([
    "zIndex",
    "opacity",
    "fontWeight",
    "lineHeight",
    "flex",
    "flexGrow",
    "flexShrink",
    "order",
    "scale"
]);
