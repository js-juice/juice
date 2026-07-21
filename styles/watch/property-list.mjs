/*
 * Example classes:
 *
 * text:center
 * text:color:red
 * padding:1o2
 * padding:left:1o5rem
 * margin:top:20px
 * width:50
 *
 * The letter "o" between digits represents a decimal point:
 * 1o5rem -> 1.5rem
 *
 * Bare numeric values default to percentages:
 * 1o2 -> 1.2%
 * 50   -> 50%
 */

export const CHECK_CSS_PROPERTIES = {
    // Sizing
    width: { $: { width: "@" } },
    height: { $: { height: "@" } },

    "min-width": { $: { minWidth: "@" } },
    "min-height": { $: { minHeight: "@" } },
    "max-width": { $: { maxWidth: "@" } },
    "max-height": { $: { maxHeight: "@" } },

    w: { $: { width: "@" } },
    h: { $: { height: "@" } },
    minw: { $: { minWidth: "@" } },
    minh: { $: { minHeight: "@" } },
    maxw: { $: { maxWidth: "@" } },
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
    hidden: { display: "none" },

    // Flexbox
    flex: {
        display: { display: "flex" },
        inline: { display: "inline-flex" },

        value: { $: { flex: "@" } },
        direction: { $: { flexDirection: "@" } },
        grow: { $: { flexGrow: "@" } },
        shrink: { $: { flexShrink: "@" } },
        basis: { $: { flexBasis: "@" } },

        row: { flexDirection: "row" },
        column: { flexDirection: "column" },
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

    bold: { fontWeight: "bold" },
    italic: { fontStyle: "italic" },
    underline: { textDecoration: "underline" },

    // Text
    text: {
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
};

/*
 * These properties accept unitless numeric values. All other bare numeric
 * values receive the default "%" unit.
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
