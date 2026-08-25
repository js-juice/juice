/**
 * Normalizes a number or `"rand(min, max)"` expression to a GPU-ready range.
 *
 * @param {number|object} value
 * @param {number|object} fallback
 * @returns {[number,number]}
 */
export function normalizeRandomRange(value, fallback = 0) {
    const read = (candidate) => {
        if (typeof candidate === "string") {
            const match = candidate
                .trim()
                .match(/^rand\(\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*,\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*\)$/i);
            if (match) {
                const min = Number(match[1]);
                const max = Number(match[2]);
                if (Number.isFinite(min) && Number.isFinite(max) && max >= min) return [min, max];
            }
        }
        const number = Number(candidate);
        return Number.isFinite(number) ? [number, number] : null;
    };
    return read(value) || read(fallback) || [0, 0];
}

/**
 * Normalizes the moving screen-space boundary shared by particle simulation and rendering.
 * Positions and speeds are expressed as fractions of the full wipe distance.
 *
 * @param {object} config
 * @param {object} current
 * @param {boolean} hasExistingState
 * @returns {{orientation:string,position:number,targetPosition:number,feather:number,angle:number,transitionSpeed:number}}
 */
export function normalizeStateBoundary(config = {}, current, hasExistingState = false) {
    const previous = current || {
        orientation: "horizontal",
        position: 0.5,
        targetPosition: 0.5,
        feather: 0,
        angle: 45,
        transitionSpeed: 0
    };
    const requestedOrientation = String(config.orientation || "").toLowerCase();
    const orientation = ["horizontal", "vertical", "diagonal"].includes(requestedOrientation)
        ? requestedOrientation
        : previous.orientation;
    const targetPosition = Math.max(
        0,
        Math.min(
            1,
            Number.isFinite(Number(config.position)) ? Number(config.position) : Number(previous.targetPosition)
        )
    );
    const transitionSpeed = Math.max(
        0,
        Number(config.transitionSpeed ?? config.speed ?? previous.transitionSpeed) || 0
    );
    const position =
        config.immediate === true || !hasExistingState || transitionSpeed <= 0
            ? targetPosition
            : Math.max(0, Math.min(1, Number(previous.position) || 0));
    return {
        orientation,
        position,
        targetPosition,
        feather: Math.max(0, Math.min(1, Number(config.feather ?? previous.feather) || 0)),
        angle: Number.isFinite(Number(config.angle)) ? Number(config.angle) : previous.angle,
        transitionSpeed
    };
}

/**
 * Converts a normalized boundary to the shader's [normalX, normalY, offset, feather] value.
 * Diagonal offsets include the projected corner extent so positions 0 and 1 fully clear the viewport.
 *
 * @param {object} boundary
 * @returns {[number,number,number,number]}
 */
export function stateBoundaryUniform(boundary) {
    let normalX = 0;
    let normalY = 1;
    if (boundary.orientation === "vertical") {
        normalX = 1;
        normalY = 0;
    } else if (boundary.orientation === "diagonal") {
        const radians = ((Number(boundary.angle) || 0) * Math.PI) / 180;
        normalX = -Math.sin(radians);
        normalY = Math.cos(radians);
    }
    const extent = Math.abs(normalX) + Math.abs(normalY);
    return [normalX, normalY, (boundary.position * 2 - 1) * extent, boundary.feather];
}

/**
 * Advances a boundary toward its target at its configured normalized distance per second.
 *
 * @param {object} boundary
 * @param {number} delta Seconds since the previous frame.
 * @returns {boolean} Whether the position changed.
 */
export function advanceStateBoundary(boundary, delta) {
    const distance = boundary.targetPosition - boundary.position;
    if (!distance || boundary.transitionSpeed <= 0) return false;
    const step = boundary.transitionSpeed * Math.max(0, Number(delta) || 0);
    boundary.position =
        Math.abs(distance) <= step ? boundary.targetPosition : boundary.position + Math.sign(distance) * step;
    return true;
}
