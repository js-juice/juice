/**
 * Shared CSS-property data.
 *
 * The utility-class compiler and <input-style> import this module. Compiler
 * syntax remains in ./watch/property-list.mjs; it is re-exported here so
 * consumers have one public property-list entry point.
 */
export {
    CHECK_CSS_PROPERTIES,
    UNITLESS_PROPERTIES
} from "./watch/property-list.mjs";

/**
 * Editor sections. Each field is:
 * [css property, label, input type, options or placeholder, min, max, step].
 */
export const CSS_PROPERTY_SECTIONS = Object.freeze([
    {
        id: "background",
        label: "Background",
        fields: [
            ["background-color", "Color", "color"],
            ["background-image", "Image / gradient", "text", "none or url(...) or linear-gradient(...)"],
            ["background-position", "Position", "text", "center center"],
            ["background-size", "Size", "select", ["", "auto", "cover", "contain"]],
            ["background-repeat", "Repeat", "select", ["", "repeat", "no-repeat", "repeat-x", "repeat-y", "space", "round"]],
            ["background-attachment", "Attachment", "select", ["", "scroll", "fixed", "local"]],
            ["background-origin", "Origin", "select", ["", "border-box", "padding-box", "content-box"]],
            ["background-clip", "Clip", "select", ["", "border-box", "padding-box", "content-box", "text"]],
            ["background-blend-mode", "Blend mode", "select", ["", "normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"]]
        ]
    },
    {
        id: "border",
        label: "Border & Radius",
        fields: [
            ["border-style", "Style", "select", ["", "none", "solid", "dashed", "dotted", "double", "groove", "ridge", "inset", "outset"]],
            ["border-width", "Width", "text", "1px"],
            ["border-color", "Color", "color"],
            ["border-top-width", "Top width", "text", "1px"],
            ["border-right-width", "Right width", "text", "1px"],
            ["border-bottom-width", "Bottom width", "text", "1px"],
            ["border-left-width", "Left width", "text", "1px"],
            ["border-top-left-radius", "Top-left radius", "text", "0"],
            ["border-top-right-radius", "Top-right radius", "text", "0"],
            ["border-bottom-right-radius", "Bottom-right radius", "text", "0"],
            ["border-bottom-left-radius", "Bottom-left radius", "text", "0"],
            ["outline", "Outline", "text", "2px solid currentColor"],
            ["outline-offset", "Outline offset", "text", "2px"]
        ]
    },
    {
        id: "effects",
        label: "Effects",
        fields: [
            ["opacity", "Opacity", "number", "0-1", "0", "1", "0.01"],
            ["box-shadow", "Box shadow", "text", "0 8px 24px rgb(0 0 0 / 20%)"],
            ["filter", "Filter", "text", "blur(0) brightness(1)"],
            ["backdrop-filter", "Backdrop filter", "text", "blur(8px)"],
            ["mix-blend-mode", "Blend mode", "select", ["", "normal", "multiply", "screen", "overlay", "darken", "lighten", "difference", "exclusion", "hue", "saturation", "color", "luminosity"]],
            ["transform", "Transform", "text", "translateX(0) scale(1)"],
            ["transform-origin", "Transform origin", "text", "center center"],
            ["transition", "Transition", "text", "all 200ms ease"],
            ["cursor", "Cursor", "select", ["", "auto", "default", "pointer", "grab", "grabbing", "text", "move", "not-allowed", "none"]]
        ]
    },
    {
        id: "text",
        label: "Text",
        fields: [
            ["color", "Color", "color"],
            ["font-family", "Font family", "text", "inherit"],
            ["font-size", "Font size", "text", "1rem"],
            ["font-weight", "Weight", "select", ["", "normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"]],
            ["font-style", "Style", "select", ["", "normal", "italic", "oblique"]],
            ["line-height", "Line height", "text", "1.5"],
            ["letter-spacing", "Letter spacing", "text", "0"],
            ["text-align", "Alignment", "select", ["", "start", "left", "center", "right", "end", "justify"]],
            ["text-decoration", "Decoration", "text", "none"],
            ["text-transform", "Transform", "select", ["", "none", "capitalize", "uppercase", "lowercase"]],
            ["text-indent", "Indent", "text", "0"],
            ["text-shadow", "Text shadow", "text", "0 1px 2px rgb(0 0 0 / 20%)"],
            ["white-space", "White space", "select", ["", "normal", "nowrap", "pre", "pre-wrap", "pre-line", "break-spaces"]],
            ["word-break", "Word break", "select", ["", "normal", "break-all", "keep-all", "break-word"]],
            ["overflow-wrap", "Overflow wrap", "select", ["", "normal", "break-word", "anywhere"]]
        ]
    },
    {
        id: "margin",
        label: "Margin",
        fields: [["margin-top", "Top", "text", "0"], ["margin-right", "Right", "text", "0"], ["margin-bottom", "Bottom", "text", "0"], ["margin-left", "Left", "text", "0"]]
    },
    {
        id: "padding",
        label: "Padding",
        fields: [["padding-top", "Top", "text", "0"], ["padding-right", "Right", "text", "0"], ["padding-bottom", "Bottom", "text", "0"], ["padding-left", "Left", "text", "0"]]
    }
]);
