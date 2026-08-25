class CSSProgressVariable {
    static easings = {
        linear: (t) => `calc(${t})`,

        easeInQuad: (t) => `calc(pow(${t}, 2))`,

        easeOutQuad: (t) => `calc(1 - pow(1 - ${t}, 2))`,

        easeInOutQuad: (t) =>
            `calc(
                2 * pow(${t}, 2)
                - pow(max(0, 2 * ${t} - 1), 2)
            )`,

        easeInCubic: (t) => `calc(pow(${t}, 3))`,

        easeOutCubic: (t) => `calc(1 - pow(1 - ${t}, 3))`,

        easeInSine: (t) => `calc(1 - cos(${t} * 90deg))`,

        easeOutSine: (t) => `calc(sin(${t} * 90deg))`,

        smoothstep: (t) => `calc(${t} * ${t} * (3 - 2 * ${t}))`
    };

    constructor(variable, min = 0, max = 1) {
        this.variable = this.normalizeName(variable);
        this.min = min;
        this.max = max;
    }

    normalizeName(name) {
        return name.startsWith("--") ? name : `--${name}`;
    }

    get value() {
        return `var(${this.variable})`;
    }

    /**
     * Create a normalized subset.
     *
     * @param {number} inPoint
     * @param {number} outPoint
     * @param {string|function} easing
     */
    slice(inPoint, outPoint, easing = "linear") {
        if (inPoint === outPoint) {
            throw new RangeError("A progress slice requires different in and out points.");
        }

        const progress = `clamp(
            0,
            (${this.value} - ${inPoint}) / (${outPoint} - ${inPoint}),
            1
        )`;

        const eased = this.applyEasing(progress, easing);

        return {
            inPoint,
            outPoint,
            easing,
            progress,
            value: eased
        };
    }

    applyEasing(progress, easing) {
        if (typeof easing === "function") {
            return easing(progress);
        }

        const fn = CSSProgressVariable.easings[easing];

        if (!fn) {
            throw new Error(`Unknown easing "${easing}"`);
        }

        return fn(progress);
    }

    get css() {
        return `${this.variable}: ${this.min};`;
    }

    get current() {
        return getComputedStyle(document.documentElement).getPropertyValue(this.variable).trim();
    }
}

export default CSSProgressVariable;
