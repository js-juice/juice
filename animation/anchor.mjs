/**
 * Anchor parsing utilities for converting position strings to numeric values.
 * Handles named positions (top, bottom, left, right, center) and percentages.
 * @module Animation/Anchor
 */

const VERTICAL_POSITIONS = ["top", "center", "bottom"];
const HORIZONTAL_POSITIONS = ["left", "center", "right"];
const UNITS = ["px", "%"];

/**
 * Parses anchor position string to numeric value (0-1 range).
 * @param {string|number} position - Position name or percentage string or numeric value
 * @returns {number} Numeric position (0 = top/left, 0.5 = center, 1 = bottom/right)
 * @example
 * parsePositionFromLocation('top'); // 0
 * parsePositionFromLocation('center'); // 0.5
 * parsePositionFromLocation('75%'); // 0.75
 */
export function parsePositionFromLocation(position) {
    if (position.endsWith("vh") || position.endsWith("vw")) {
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const relValue = parseFloat(position);
        if (position.endsWith("vh")) {
            return relValue / vh;
        } else {
            return relValue / vw;
        }
    } else if (position.endsWith("%")) {
        return position.includes("%") ? parseFloat(position) / 100 : position;
    } else if (position.endsWith("px")) {
        return parseFloat(position);
    }

    switch (position) {
        case "top":
            return 0;
            break;
        case "bottom":
            return 1;
            break;
        case "left":
            return 0;
            break;
        case "right":
            return 1;
            break;
        case "center":
            return 0.5;
            break;
        default:
            return position.includes("%") ? parseFloat(position) / 100 : position;
    }
}

/**
 * Parses input values for anchor behavior.
 * @param {*} position - Parameter value.
 * @returns {*} Result of parseAnchor.
 */
export function parseAnchor(position) {
    if (typeof position === "string") {
        if (!position.includes(" ")) position = `${position} ${position}`;
        const [x, y] = position.split(" ");
        return parseAnchor({ x, y });
    }
    const parsed = { x: 0, y: 0 };
    ["x", "y"].forEach((axis) => {
        const value = position[axis];
        const isVertical = axis === "y";
        if (axis === "y" && VERTICAL_POSITIONS.includes(value)) {
            parsed.y = VERTICAL_POSITIONS.indexOf(value) * 0.5;
        } else if (axis === "x" && HORIZONTAL_POSITIONS.includes(value)) {
            parsed.x = HORIZONTAL_POSITIONS.indexOf(value) * 0.5;
        } else if (UNITS.some((unit) => String(value).endsWith(unit))) {
            if (String(value).trim().endsWith("%")) {
                parsed[axis] = parseFloat(value) / 100;
            } else {
                parsed[axis] = value;
            }
        } else {
            parsed[axis] = `${value}px`;
        }
    });
    return parsed;
}

export function parsePosition(position) {
    return parseAnchor(position);
}

/**
 * Parses anchor string with x and y positions into numeric coordinates.
 * @param {string} string - Anchor position string (e.g., "top left", "center center")
 * @returns {{x: number, y: number}} Anchor coordinates as object
 * @example
 * parseAnchor('top left'); // { x: 0, y: 0 }
 * parseAnchor('center center'); // { x: 0.5, y: 0.5 }
 * parseAnchor('bottom right'); // { x: 1, y: 1 }
 */

export function parseAnchorForContent(string, content) {
    const { x, y } = parseAnchor(string);
    if ([x, y].some((v) => typeof v === "string")) {
        [x, y].forEach((v, i) => {
            if (v.endsWith("px")) {
                const contentRect = content.getBoundingClientRect();
                if (i === 0) x = parseFloat(x) / contentRect.width;
                if (i === 1) y = parseFloat(y) / contentRect.height;
            } else if (v.endsWith("%")) {
                if (i === 0) x = parseFloat(x) / 100;
                if (i === 1) y = parseFloat(y) / 100;
            }
        });
    }
    content.style.transformOrigin = `${x * 100}% ${y * 100}%`;
    content.style.left = `${x * 100}%`;
    content.style.top = `${y * 100}%`;
    return { x, y };
}
