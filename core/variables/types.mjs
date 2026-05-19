export const GROUP_TYPES = {
    object: { long: "object", aliases: ["obj"], prefix: "{", suffix: "}", class: Object, unit: "{}" },
    array: { long: "array", aliases: ["arr"], prefix: "[", suffix: "]", class: Array, unit: "[]" },
    function: { long: "function", aliases: ["func"], prefix: "(", suffix: ")", class: Function, unit: "()" },
    template: { long: "template", aliases: ["tmpl"], prefix: "<", suffix: ">", class: String, unit: "<>" }
};

export const GROUP_UNITS = Object.values(GROUP_TYPES)
    .map((type) => type.aliases)
    .flat();

export const GROUP_PREFIXES = Object.values(GROUP_TYPES).map((type) => type.prefix);

export const GROUP_SUFFIXES = Object.values(GROUP_TYPES).map((type) => type.suffix);

export const COLOR_TYPES = {
    hex: { long: "hexadecimal", aliases: ["hex"], prefix: "#", class: String },
    rgb: { long: "red green blue", aliases: ["rgb"], prefix: "rgb(", suffix: ")", class: String },
    hsl: { long: "hue saturation lightness", aliases: ["hsl"], prefix: "hsl(", suffix: ")", class: String },
    rgba: { long: "red green blue alpha", aliases: ["rgba"], prefix: "rgba(", suffix: ")", class: String },
    hsla: { long: "hue saturation lightness alpha", aliases: ["hsla"], prefix: "hsla(", suffix: ")", class: String }
};

export const COLOR_UNITS = Object.values(COLOR_TYPES)
    .map((type) => type.aliases)
    .flat();

export const ANGLE_TYPES = {
    deg: { long: "degree", aliases: ["deg"], unit: "1/360 of a turn" },
    rad: { long: "radian", aliases: ["rad"], unit: "1/2π of a turn" },
    grad: { long: "gradian", aliases: ["grad"], unit: "1/400 of a turn" },
    turn: { long: "turn", aliases: ["turn"], unit: "1 full rotation" }
};

export const ANGLE_UNITS = Object.values(ANGLE_TYPES)
    .map((type) => type.aliases)
    .flat();

const DISTANCE_TYPES = {
    DIGITAL: {
        px: { long: "pixel", aliases: ["px"], unit: "screen pixel" },
        em: { long: "em", aliases: ["em"], unit: "font-size" },
        rem: { long: "rem", aliases: ["rem"], unit: "root font-size" },
        vw: { long: "viewport width", aliases: ["vw"], unit: "1% of viewport width" },
        vh: { long: "viewport height", aliases: ["vh"], unit: "1% of viewport height" },
        vmin: {
            long: "viewport minimum",
            aliases: ["vmin"],
            unit: "minimum of viewport width or height"
        },
        vmax: {
            long: "viewport maximum",
            aliases: ["vmax"],
            unit: "maximum of viewport width or height"
        }
    },
    PHYSICAL: {
        ft: { long: "foot", aliases: ["ft"], unit: "0.3048 meters" },
        in: { long: "inch", aliases: ["in"], unit: "0.0254 meters" },
        cm: { long: "centimeter", aliases: ["cm"], unit: "0.01 meters" },
        mm: { long: "millimeter", aliases: ["mm"], unit: "0.001 meters" },
        m: { long: "meter", aliases: ["m"], unit: "1 meter" }
    }
};

export const DISTANCE_UNITS = Object.values(DISTANCE_TYPES.DIGITAL)
    .map((type) => type.aliases)
    .flat()
    .concat(
        Object.values(DISTANCE_TYPES.PHYSICAL)
            .map((type) => type.aliases)
            .flat()
    );

export const TIME_TYPES = {
    ms: { long: "millisecond", aliases: ["ms"], unit: "1/1000 of a second" },
    s: { long: "second", aliases: ["s"], unit: "1 second" },
    min: { long: "minute", aliases: ["min"], unit: "60 seconds" },
    hr: { long: "hour", aliases: ["hr"], unit: "60 minutes" },
    d: { long: "day", aliases: ["d"], unit: "24 hours" },
    w: { long: "week", aliases: ["w"], unit: "7 days" },
    mo: { long: "month", aliases: ["mo"], unit: "30 days" },
    y: { long: "year", aliases: ["y"], unit: "365 days" }
};

export const TIME_UNITS = Object.values(TIME_TYPES)
    .map((type) => type.aliases)
    .flat();

export const TYPES = {
    string: { name: "string", aliases: ["str", "text", '""'], unit: null, class: String },
    boolean: { name: "boolean", aliases: ["bool"], unit: null, class: Boolean },
    number: { name: "number", subtypes: ["float", "integer"], class: Number, unit: "n" },
    integer: { name: "integer", aliases: ["int"], unit: null, class: Number },
    float: { name: "float", aliases: ["real", "double", "decimal", "number"], class: Number, unit: null },
    object: { name: "object", aliases: ["obj", "dict", "map"], postfix: "{}", class: Object, unit: null },
    array: { name: "array", aliases: ["list", "arr"], inclosure: ["[", "]"], class: Array, unit: "[]" },
    color: { name: "color", aliases: ["colour"], prefix: "#", class: String, unit: null }
};
