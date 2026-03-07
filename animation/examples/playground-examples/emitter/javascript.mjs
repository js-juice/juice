import ParticleEmitter from "../../../particles/emitter.mjs";
import Particle from "../../../particles/particle.mjs";

/**
 * Executes $.
 * @param {*} id - Parameter value.
 * @returns {*} Result of $.
 */
function $(id) {
    return document.getElementById(id);
}

const getNumeric = (el, fallback = 0) => {
    if (!el) return fallback;
    const prop = el.value;
    if (prop !== undefined && prop !== null && String(prop).trim() !== "") {
        const n = Number(prop);
        return Number.isFinite(n) ? n : fallback;
    }
    const attr = el.getAttribute && el.getAttribute("value");
    if (attr !== null && attr !== undefined && String(attr).trim() !== "") {
        const n = Number(attr);
        return Number.isFinite(n) ? n : fallback;
    }
    return fallback;
};

// Read a control's current value, probing shadowRoot/native inputs and attributes.
const getValueFromControl = (el) => {
    if (!el) return null;
    try {
        if (el.value !== undefined && el.value !== null && String(el.value).trim() !== "") return el.value;
    } catch (e) {}
    try {
        const root = el.shadowRoot || el;
        if (root && typeof root.querySelector === "function") {
            const native = root.querySelector("input,textarea,select");
            if (native && native.value !== undefined && native.value !== null && String(native.value).trim() !== "")
                return native.value;
        }
    } catch (e) {}
    try {
        const attr = el.getAttribute && el.getAttribute("value");
        if (attr !== null && attr !== undefined && String(attr).trim() !== "") return attr;
    } catch (e) {}
    return null;
};

const getNumericFromControl = (el, fallback = 0) => {
    const v = getValueFromControl(el);
    if (v === null || v === undefined || String(v).trim() === "") return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
};

const canvas = $("emitter-canvas");
const ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;

let width = 300;
let height = 300;
let resizeObserver = null;
let didInitialCenter = false;

/**
 * Executes centerEmitterOnCanvas.
 * @param {*} param1 - Parameter value.
 * @returns {*} Result of centerEmitterOnCanvas.
 */
function centerEmitterOnCanvas({ syncInputs = true } = {}) {
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    emitter.x = centerX;
    emitter.y = centerY;
    if (syncInputs) {
        if (posXInput) {
            try {
                posXInput.value = String(centerX);
            } catch (e) {}
            try {
                if (typeof posXInput.setAttribute === "function") posXInput.setAttribute("value", String(centerX));
            } catch (e) {}
            try {
                const root = posXInput.shadowRoot || posXInput;
                const native = root && root.querySelector && root.querySelector("input,textarea,select");
                if (native) native.value = String(centerX);
            } catch (e) {}
        }
        if (posYInput) {
            try {
                posYInput.value = String(centerY);
            } catch (e) {}
            try {
                if (typeof posYInput.setAttribute === "function") posYInput.setAttribute("value", String(centerY));
            } catch (e) {}
            try {
                const root = posYInput.shadowRoot || posYInput;
                const native = root && root.querySelector && root.querySelector("input,textarea,select");
                if (native) native.value = String(centerY);
            } catch (e) {}
        }
        if (positionControl) {
            try {
                positionControl.value = `${centerX},${centerY},0`;
            } catch (e) {
                if (typeof positionControl.setAttribute === "function") {
                    positionControl.setAttribute("value", `${centerX},${centerY},0`);
                }
            }
            try {
                const root = positionControl.shadowRoot || positionControl;
                const native = root && root.querySelector && root.querySelector("input,textarea,select");
                if (native) native.value = `${centerX},${centerY},0`;
            } catch (e) {}
        }
    }
}

/**
 * Executes resize.
 * @returns {*} Result of resize.
 */
function resize() {
    if (!canvas) return;
    // Preserve previous CSS pixel size so we can scale positions when
    // the backing store changes (avoids rendering at the old 300px size).
    const oldW = width || 0;
    const oldH = height || 0;
    // Prefer true layout CSS pixels from the canvas element (clientWidth/Height)
    // and compute the backing store from those values. Using client sizes avoids
    // mixed values from parent rects and prevents unexpected larger backing sizes.
    const parent = canvas.parentElement || canvas;
    const parentRect = parent.getBoundingClientRect();
    const rect = canvas.getBoundingClientRect();
    const dpr = typeof window !== "undefined" && window.devicePixelRatio ? Math.max(1, window.devicePixelRatio) : 1;
    // Try to find an ancestor that represents the intended layout size
    // (sometimes the immediate parent reports a smaller height). Walk up
    // a few ancestors and prefer the first one with a larger clientHeight.
    let cssW = Math.max(1, Math.floor(canvas.clientWidth || parent.clientWidth || parentRect.width || rect.width));
    let cssH = Math.max(1, Math.floor(canvas.clientHeight || parent.clientHeight || parentRect.height || rect.height));
    try {
        let anc = parent;
        for (let i = 0; i < 6 && anc; i++) {
            try {
                const cw = anc.clientWidth || 0;
                const ch = anc.clientHeight || 0;
                if (cw > cssW) cssW = Math.floor(cw);
                if (ch > cssH) cssH = Math.floor(ch);
            } catch (e) {}
            anc = anc.parentElement;
        }
    } catch (e) {}
    width = cssW;
    height = cssH;
    // Ensure the canvas CSS size matches the computed CSS pixels.
    try {
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
    } catch (e) {}
    // Set backing store size using rounded DPR multiplication to avoid off-by-one
    // and fractional-pixel accumulation that can produce large mismatches.
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    if (ctx && typeof ctx.setTransform === "function") {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    // If the canvas size has changed from a previous size, scale the
    // emitter and existing particle positions so rendering maps to the
    // new dimensions instead of remaining placed at the old 300px layout.
    try {
        if (oldW > 1 && oldH > 1 && (oldW !== width || oldH !== height) && emitter) {
            const sx = width / oldW;
            const sy = height / oldH;
            if (Number.isFinite(emitter.x)) emitter.x = emitter.x * sx;
            if (Number.isFinite(emitter.y)) emitter.y = emitter.y * sy;
            if (Array.isArray(emitter.particles)) {
                emitter.particles.forEach((p) => {
                    if (Number.isFinite(p.x)) p.x = p.x * sx;
                    if (Number.isFinite(p.y)) p.y = p.y * sy;
                    if (p.useDOM && p.element) {
                        try {
                            p.element.style.transform = `translate(${p.x}px, ${p.y}px)`;
                        } catch (e) {}
                    }
                });
            }
        }
    } catch (e) {}

    // If the canvas height changed a lot, recentre the emitter to avoid
    // large vertical offsets created by prior 300px layouts.
    try {
        const heightDelta = Math.abs((oldH || 0) - height);
        if (heightDelta > 50 && typeof centerEmitterOnCanvas === "function") {
            centerEmitterOnCanvas({ syncInputs: false });
        }
    } catch (e) {}
}

window.addEventListener("resize", resize);

// control elements (resolved at init time)
let emitRateEl;
let emitSpeedEl;
let emitSpreadEl;
let emitSizeEl;
let emitLifeEl;
let emitDirEl;
let startBtn;
let stopBtn;
let clearBtn;
let burstInput;
let burstBtn;
let gravX;
let gravY;
let gravZ;
let positionControl;
let gravityControl;
let frictionInput;
let posXInput;
let posYInput;
let posZInput;
let directionControlEl;

// Initialize emitter (values may be overwritten by controls later)
let emitter = new ParticleEmitter({
    x: 0,
    y: 0,
    particlesPerSecond: getNumeric(emitRateEl, 40),
    direction: (getNumeric(emitDirEl, -90) * Math.PI) / 180
});

// Expose emitter to the global window as early as possible for console debugging
try {
    if (typeof window !== "undefined") window.emitter = emitter;
    // Also try to expose a reference on the parent window for easier
    // debugging when the iframe is same-origin (use a clearly-named key).
    try {
        if (typeof window !== "undefined" && window.self !== window.top && window.parent) {
            try {
                window.parent.__juice_emitter = emitter;
            } catch (e) {
                // parent may be cross-origin or deny access; ignore.
            }
        }
    } catch (e) {
        /* ignore */
    }
} catch (e) {}

// Override initial values from live controls if present
if (emitRateEl) emitter.particlesPerSecond = getNumericFromControl(emitRateEl, 10);
if (emitSpeedEl) emitter.speed = getNumericFromControl(emitSpeedEl, 100);
if (emitSpreadEl) emitter.spread = (getNumericFromControl(emitSpreadEl, 0) || 0) * (Math.PI / 180);
if (emitSizeEl) emitter.size = getNumericFromControl(emitSizeEl, 2);
if (emitLifeEl) emitter.lifespan = getNumericFromControl(emitLifeEl, 1);
if (emitDirEl) emitter.direction = (getNumericFromControl(emitDirEl, 0) || 0) * (Math.PI / 180);
// Track last applied spread so we can update existing particles when it changes
let lastAppliedSpread = emitter.spread || 0;
let running = true;
let lastTime = performance.now();

/**
 * Parses input values for directionvector behavior.
 * @param {*} raw - Parameter value.
 * @returns {*} Result of parseDirectionVector.
 */
function parseDirectionVector(raw) {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === "object") {
        const x = Number(raw.x);
        const y = Number(raw.y);
        const z = Number(raw.z);
        return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) ? { x, y, z } : null;
    }
    const matches = String(raw)
        .trim()
        .match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi);
    if (!matches || matches.length < 3) return null;
    const x = Number(matches[0]);
    const y = Number(matches[1]);
    const z = Number(matches[2]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
    return { x, y, z };
}

/**
 * Executes normalize2D.
 * @param {*} x - Parameter value.
 * @param {*} y - Parameter value.
 * @returns {*} Result of normalize2D.
 */
function normalize2D(x, y) {
    const len = Math.hypot(x, y);
    if (!(len > 1e-6)) return null;
    return { x: x / len, y: y / len };
}

/**
 * Executes directionRadiansToVectorString.
 * @param {*} radians - Parameter value.
 * @returns {*} Result of directionRadiansToVectorString.
 */
function directionRadiansToVectorString(radians) {
    const x = Math.cos(radians);
    const y = -Math.sin(radians);
    return `${x.toFixed(4)},${y.toFixed(4)},0`;
}

/**
 * Updates module state from runtime inputs.
 * @returns {*} Result of updateExistingParticles.
 */
function updateExistingParticles() {
    try {
        if (emitter && Array.isArray(emitter.particles)) {
            emitter.particles.forEach((p) => {
                p.forces = emitter.forces || [];
                const vx = Number(p.velocityX) || 0;
                const vy = Number(p.velocityY) || 0;
                const mag = Math.hypot(vx, vy);
                if (mag > 1e-6 && Number.isFinite(emitter.speed) && emitter.speed > 0) {
                    const scale = emitter.speed / mag;
                    p.velocityX = vx * scale;
                    p.velocityY = vy * scale;
                }
                try {
                    if (Number.isFinite(emitter.size)) {
                        p.size = emitter.size;
                        if (p.useDOM && p.element) {
                            p.element.style.width = `${p.size}px`;
                            p.element.style.height = `${p.size}px`;
                        }
                    }
                    if (Number.isFinite(emitter.lifespan)) {
                        const remaining = Math.max(0, p.lifespan - p.age);
                        const frac = p.lifespan > 0 ? remaining / p.lifespan : 0;
                        p.lifespan = emitter.lifespan;
                        p.age = Math.max(0, p.lifespan - frac * p.lifespan);
                    }
                } catch (e) {
                    /* ignore particle update errors */
                }
            });
            // Do not reset the emission timer here — changing properties
            // should not pause or delay subsequent emissions.
        }
    } catch (e) {
        /* ignore */
    }
}

/**
 * Executes applyDirectionControl.
 * @param {*} param1 - Parameter value.
 * @returns {*} Result of applyDirectionControl.
 */
function applyDirectionControl({ syncDegreeInput = true } = {}) {
    if (!directionControlEl) return false;
    const parsed = parseDirectionVector(directionControlEl.value || directionControlEl.getAttribute("value"));
    if (!parsed) return false;
    const planar = normalize2D(parsed.x, parsed.y);
    if (!planar) return false;
    const radians = Math.atan2(-planar.y, planar.x);
    emitter.direction = radians;
    if (syncDegreeInput && emitDirEl) {
        emitDirEl.value = String((radians * 180) / Math.PI);
    }
    return true;
}

/**
 * Executes applyControls.
 * @returns {*} Result of applyControls.
 */
function applyControls() {
    console.debug("applyControls called");
    try {
        const last = (typeof window !== "undefined" && window.__emitter_lastControl) || null;
        if (last) console.debug("last control seen:", last);
        if (last && Date.now() - last.ts < 1500) {
            // Apply only the changed control to avoid resetting other properties.
            const id = String(last.control || "").toLowerCase();
            // Try to resolve a local element for this control so we can read its
            // shadow-root-aware value; fall back to the forwarded value.
            let lastEl = null;
            try {
                if (typeof resolveLocalEl === "function") lastEl = resolveLocalEl(null, [last.control]);
            } catch (e) {}
            const val = (lastEl && getResolvedValue(lastEl)) || last.value;
            console.debug("single-control lastEl/val:", { id: last.control, lastEl: !!lastEl, val });
            const n = Number(val);
            if (id.includes("emit-rate") || id.includes("emitter-pps") || id.includes("pps")) {
                if (Number.isFinite(n)) emitter.particlesPerSecond = n;
            } else if (id.includes("emit-speed") || id.includes("emitter-speed") || id.includes("speed")) {
                if (Number.isFinite(n)) emitter.speed = n;
            } else if (id.includes("emit-spread") || id.includes("emitter-spread") || id.includes("spread")) {
                if (Number.isFinite(n)) emitter.spread = n * (Math.PI / 180);
            } else if (id.includes("emit-size") || id.includes("emitter-size") || id.includes("size")) {
                if (Number.isFinite(n)) emitter.size = n;
            } else if (id.includes("emit-life") || id.includes("emitter-life") || id.includes("life")) {
                if (Number.isFinite(n)) emitter.lifespan = n;
            } else if (id.includes("emit-dir") || id.includes("emitter-direction") || id.includes("direction")) {
                if (Number.isFinite(n)) emitter.direction = n * (Math.PI / 180);
                else {
                    // try vector parse
                    const parsed = parseDirectionVector(val);
                    if (parsed) {
                        const planar = normalize2D(parsed.x, parsed.y);
                        if (planar) emitter.direction = Math.atan2(-planar.y, planar.x);
                    }
                }
            } else if (id === "position" || id.includes("emitter-pos") || id.includes("pos")) {
                // Position change: support 'position' composite or separate x/y
                // Capture previous emitter coords and compute delta locally.
                const oldX = Number.isFinite(emitter.x) ? emitter.x : 0;
                const oldY = Number.isFinite(emitter.y) ? emitter.y : 0;
                if (id === "position") {
                    const parsed = parseDirectionVector(val || "");
                    if (parsed) {
                        if (Number.isFinite(parsed.x)) emitter.x = parsed.x;
                        if (Number.isFinite(parsed.y)) emitter.y = parsed.y;
                    }
                } else if (id.includes("pos-x") || id.includes("emitter-pos-x") || id.includes("posx")) {
                    if (Number.isFinite(n)) emitter.x = n;
                } else if (id.includes("pos-y") || id.includes("emitter-pos-y") || id.includes("posy")) {
                    if (Number.isFinite(n)) emitter.y = n;
                }
                try {
                    const dx = emitter.x - oldX;
                    const dy = emitter.y - oldY;
                    console.debug("position applied:", { x: emitter.x, y: emitter.y, dx, dy });
                    // Shift existing particles by the change in emitter position instead
                    // of clearing them so emission doesn't pause or jump.
                    if ((dx || dy) && Array.isArray(emitter.particles)) {
                        emitter.particles.forEach((p) => {
                            if (Number.isFinite(p.x)) p.x += dx;
                            if (Number.isFinite(p.y)) p.y += dy;
                            if (p.useDOM && p.element) {
                                try {
                                    p.element.style.transform = `translate(${p.x}px, ${p.y}px)`;
                                } catch (e) {}
                            }
                        });
                    }
                } catch (e) {
                    console.debug("position shift failed", e);
                }
            } else if (id.includes("gravity") || id.includes("grav")) {
                // gravity vector or components
                const parsed = parseDirectionVector(val || "");
                console.debug("single-control gravity parsed:", parsed, "raw:", val, "lastEl:", !!lastEl);

                if (parsed) {
                    const gx = Number(parsed.x) || 0;
                    const gy = Number(parsed.y) || 0;
                    const gz = Number(parsed.z) || 0;
                    console.debug("single-control applying gravity:", { gx, gy, gz });
                    emitter.forces = [{ x: gx, y: gy, z: gz }];
                    emitter.particles.forEach((p) => (p.forces = emitter.forces));
                } else {
                    // try numeric fallbacks
                    const n = Number(val);
                    if (Number.isFinite(n)) {
                        emitter.forces = [{ x: 0, y: n, z: 0 }];
                        emitter.particles.forEach((p) => (p.forces = emitter.forces));
                    }
                }
            }
            // update existing particles and overlay then clear the last control marker
            updateExistingParticles();
            try {
                console.debug("emitter updated (single)", {
                    particlesPerSecond: emitter.particlesPerSecond,
                    speed: emitter.speed,
                    spread: emitter.spread,
                    size: emitter.size,
                    lifespan: emitter.lifespan,
                    forces: emitter.forces
                });
            } catch (e) {}
            try {
                if (typeof window !== "undefined" && typeof window.updateOverlay === "function") window.updateOverlay();
            } catch (e) {}
            try {
                window.__emitter_lastControl = null;
            } catch (e) {}
            return;
        }
    } catch (e) {}
    const getNumericLocal = (el, fallback = 0) => {
        if (!el) return fallback;
        const prop = el.value;
        if (prop !== undefined && prop !== null && String(prop).trim() !== "") {
            const n = Number(prop);
            return Number.isFinite(n) ? n : fallback;
        }
        const attr = el.getAttribute && el.getAttribute("value");
        if (attr !== null && attr !== undefined && String(attr).trim() !== "") {
            const n = Number(attr);
            return Number.isFinite(n) ? n : fallback;
        }
        return fallback;
    };
    // Resolve controls at read-time across document/iframe boundaries.
    const resolveLive = (id) => {
        try {
            if (!id) return null;
            let e = document.getElementById(id);
            if (e) return e;
            try {
                if (window && window.self !== window.top && window.parent && window.parent.document) {
                    e = window.parent.document.getElementById(id);
                    if (e) return e;
                }
            } catch (err) {
                /* ignore cross-origin */
            }
            return null;
        } catch (err) {
            return null;
        }
    };

    // Resolve only iframe-local elements (do not return parent DOM elements here).
    const resolveLocalEl = (el, ids = []) => {
        try {
            if (el && el.ownerDocument === document) return el;
            for (let i = 0; i < ids.length; i++) {
                const local = document.getElementById(ids[i]);
                if (local) return local;
            }
        } catch (e) {}
        return null;
    };

    const emitRateResolved = resolveLocalEl(emitRateEl, ["emit-rate", "emitter-pps"]);
    const emitSpeedResolved = resolveLocalEl(emitSpeedEl, ["emit-speed", "emitter-speed"]);
    const emitSpreadResolved = resolveLocalEl(emitSpreadEl, ["emit-spread", "emitter-spread"]);
    const emitSizeResolved = resolveLocalEl(emitSizeEl, ["emit-size", "emitter-size"]);
    const emitLifeResolved = resolveLocalEl(emitLifeEl, ["emit-life", "emitter-life"]);
    const emitDirResolved = resolveLocalEl(emitDirEl, ["emit-dir", "emitter-direction"]);

    const getResolvedValue = (el) => {
        if (!el) return null;
        try {
            const id = el.id || el.name || el.tagName;
            if (
                typeof window !== "undefined" &&
                window.__emitter_lastControl &&
                window.__emitter_lastControl.control === id
            ) {
                return window.__emitter_lastControl.value;
            }
        } catch (e) {}
        return getValueFromControl(el);
    };

    console.debug("controls values:", {
        pps: emitRateResolved && getResolvedValue(emitRateResolved),
        speed: emitSpeedResolved && getResolvedValue(emitSpeedResolved),
        spread: emitSpreadResolved && getResolvedValue(emitSpreadResolved),
        dir: emitDirResolved && getResolvedValue(emitDirResolved)
    });

    // Apply numeric properties only when the control actually provides a non-empty value.
    if (emitRateResolved) {
        const v = getResolvedValue(emitRateResolved);
        if (v !== null && String(v).trim() !== "") {
            const n = Number(v);
            if (Number.isFinite(n)) emitter.particlesPerSecond = n;
        }
    }
    if (emitSpeedResolved) {
        const v = getResolvedValue(emitSpeedResolved);
        if (v !== null && String(v).trim() !== "") {
            const n = Number(v);
            if (Number.isFinite(n)) emitter.speed = n;
        }
    }
    if (emitSpreadResolved) {
        const v = getResolvedValue(emitSpreadResolved);
        if (v !== null && String(v).trim() !== "") {
            const n = Number(v);
            if (Number.isFinite(n)) emitter.spread = n * (Math.PI / 180);
        }
    }
    if (emitSizeResolved) {
        const v = getResolvedValue(emitSizeResolved);
        if (v !== null && String(v).trim() !== "") {
            const n = Number(v);
            if (Number.isFinite(n)) emitter.size = n;
        }
    }
    if (emitLifeResolved) {
        const v = getResolvedValue(emitLifeResolved);
        if (v !== null && String(v).trim() !== "") {
            const n = Number(v);
            if (Number.isFinite(n)) emitter.lifespan = n;
        }
    }
    if (emitDirResolved) {
        const v = getResolvedValue(emitDirResolved);
        if (v !== null && String(v).trim() !== "") {
            const n = Number(v);
            if (Number.isFinite(n)) emitter.direction = n * (Math.PI / 180);
        }
    }
    applyDirectionControl({ syncDegreeInput: true });

    // Resolve position controls live (may live in parent document or be custom elements)
    const positionResolved = resolveLive("position") || resolveLocalEl(positionControl, ["position"]);
    const posXResolved = resolveLive("emitter-pos-x") || resolveLocalEl(posXInput, ["emitter-pos-x"]);
    const posYResolved = resolveLive("emitter-pos-y") || resolveLocalEl(posYInput, ["emitter-pos-y"]);

    if (positionResolved) {
        const raw =
            getResolvedValue(positionResolved) ||
            (positionResolved.getAttribute && positionResolved.getAttribute("value"));
        const parsed = parseDirectionVector(raw);
        console.debug("position resolved raw/parsed:", { raw, parsed });
        if (parsed) {
            if (Number.isFinite(parsed.x)) emitter.x = parsed.x;
            if (Number.isFinite(parsed.y)) emitter.y = parsed.y;
        }
    } else {
        if (posXResolved) {
            const xv = Number(
                getResolvedValue(posXResolved) ||
                    (posXResolved.getAttribute && posXResolved.getAttribute("value")) ||
                    posXResolved.value
            );
            console.debug("posX resolved:", { xv });
            if (Number.isFinite(xv)) emitter.x = xv;
        }
        if (posYResolved) {
            const yv = Number(
                getResolvedValue(posYResolved) ||
                    (posYResolved.getAttribute && posYResolved.getAttribute("value")) ||
                    posYResolved.value
            );
            console.debug("posY resolved:", { yv });
            if (Number.isFinite(yv)) emitter.y = yv;
        }
    }

    // Gravity/forces: resolve live controls (parent or local) and use forwarded value when present.
    const gravityResolved = resolveLive("gravity") || resolveLocalEl(gravityControl, ["gravity"]);
    if (gravityResolved) {
        const rawg =
            getResolvedValue(gravityResolved) ||
            (gravityResolved.getAttribute && gravityResolved.getAttribute("value"));
        console.debug("gravity resolved raw:", rawg);

        const g = parseDirectionVector(rawg || "");
        const gx = Number(g?.x || 0);
        const gy = Number(g?.y || 0);
        const gz = Number(g?.z || 0);
        console.debug("applying gravity:", { gx, gy, gz });
        emitter.forces = [{ x: gx, y: gy, z: gz }];
        emitter.particles.forEach((p) => (p.forces = emitter.forces));
    } else if (gravX || gravY) {
        const gx = Number(getResolvedValue(gravX) || gravX?.value || 0);
        const gy = Number(getResolvedValue(gravY) || gravY?.value || 0);
        // gravZ may be absent in some UIs; include if present
        const gz = Number(getResolvedValue(gravZ) || gravZ?.value || 0);
        emitter.forces = [{ x: gx, y: gy, z: gz }];
        emitter.particles.forEach((p) => (p.forces = emitter.forces));
    }
    if (frictionInput) {
        emitter._friction = Number(frictionInput.value) || 0;
    }

    // Debug helper: allow forcing a particle clear to verify new settings
    try {
        if (typeof window !== "undefined" && window.__EMITTER_DEBUG_FORCE_CLEAR) {
            emitter.particles.length = 0;
            console.debug("emitter: debug force cleared existing particles");
        }
    } catch (e) {
        /* ignore */
    }

    try {
        if (emitter && Array.isArray(emitter.particles)) {
            emitter.particles.forEach((p) => {
                p.forces = emitter.forces || [];
                const vx = Number(p.velocityX) || 0;
                const vy = Number(p.velocityY) || 0;
                const mag = Math.hypot(vx, vy);
                if (mag > 1e-6 && Number.isFinite(emitter.speed) && emitter.speed > 0) {
                    const scale = emitter.speed / mag;
                    p.velocityX = vx * scale;
                    p.velocityY = vy * scale;
                }
                try {
                    if (Number.isFinite(emitter.size)) {
                        p.size = emitter.size;
                        if (p.useDOM && p.element) {
                            p.element.style.width = `${p.size}px`;
                            p.element.style.height = `${p.size}px`;
                        }
                    }
                    if (Number.isFinite(emitter.lifespan)) {
                        const remaining = Math.max(0, p.lifespan - p.age);
                        const frac = p.lifespan > 0 ? remaining / p.lifespan : 0;
                        p.lifespan = emitter.lifespan;
                        p.age = Math.max(0, p.lifespan - frac * p.lifespan);
                    }
                } catch (e) {
                    /* ignore particle update errors */
                }
            });
            // Do not reset the emission timer here — changing particle properties
            // should not pause emission. Keep lastEmissionTime intact.
        }
    } catch (e) {
        /* ignore */
    }

    console.debug("emitter updated", {
        particlesPerSecond: emitter.particlesPerSecond,
        speed: emitter.speed,
        spread: emitter.spread,
        size: emitter.size,
        lifespan: emitter.lifespan,
        forces: emitter.forces
    });
}

/**
 * Sets upcontrols values.
 * @returns {*} Result of setupControls.
 */
function setupControls() {
    const findEl = (id) => {
        if (!id) return null;
        let el = document.getElementById(id);
        if (el) return el;
        try {
            if (window && window.self !== window.top && window.parent && window.parent.document) {
                el = window.parent.document.getElementById(id);
                if (el) return el;
            }
        } catch (e) {
            // cross-origin or other access error — ignore
        }
        return null;
    };

    emitRateEl = findEl("emit-rate") || findEl("emitter-pps");
    emitSpeedEl = findEl("emit-speed") || findEl("emitter-speed");
    emitSpreadEl = findEl("emit-spread") || findEl("emitter-spread");
    emitSizeEl = findEl("emit-size") || findEl("emitter-size");
    emitLifeEl = findEl("emit-life") || findEl("emitter-life");
    emitDirEl = findEl("emit-dir") || findEl("emitter-direction");
    startBtn = findEl("start-btn") || findEl("emitter-toggle");
    stopBtn = findEl("stop-btn");
    clearBtn = findEl("clear-btn");
    burstInput = findEl("emitter-burst") || findEl("emit-burst");
    burstBtn = findEl("emitter-burst-btn");
    gravX = findEl("emitter-grav-x");
    gravY = findEl("emitter-grav-y");
    gravZ = findEl("emitter-grav-z");
    positionControl = findEl("position");
    gravityControl = findEl("gravity");
    frictionInput = findEl("emitter-friction");
    // theta/phi removed — direction is controlled via `input-direction`
    posXInput = findEl("emitter-pos-x");
    posYInput = findEl("emitter-pos-y");
    posZInput = findEl("emitter-pos-z");
    directionControlEl = findEl("direction");

    const controls = [
        emitRateEl,
        emitSpeedEl,
        emitSpreadEl,
        emitSizeEl,
        emitLifeEl,
        emitDirEl,
        posXInput,
        posYInput,
        gravX,
        gravY,
        gravZ,
        frictionInput,
        positionControl,
        gravityControl
    ].filter(Boolean);

    function attachNativeIfPresent(hostEl) {
        if (!hostEl) return;

        try {
            hostEl.addEventListener("input", applyControls);
            hostEl.addEventListener("change", applyControls);
            hostEl.addEventListener("change", (ev) => {
                try {
                    const id = hostEl.id || hostEl.name || hostEl.tagName;
                    const val =
                        hostEl.value !== undefined ? hostEl.value : hostEl.getAttribute && hostEl.getAttribute("value");
                    console.debug("control:event", { control: id, value: val });
                    try {
                        window.__emitter_lastControl = { control: id, value: val, ts: Date.now() };
                    } catch (e) {}
                } catch (e) {}
            });
        } catch (e) {
            /* ignore host attach errors */
        }

        if (hostEl.__emitterNativeAttached) return;

        const findAndAttach = () => {
            try {
                const root = hostEl.shadowRoot || hostEl;
                const native = root.querySelector && root.querySelector("input,textarea,select");
                if (native) {
                    native.addEventListener("input", applyControls);
                    native.addEventListener("change", applyControls);
                    native.addEventListener("change", (ev) => {
                        try {
                            const id = hostEl.id || hostEl.name || hostEl.tagName;
                            const val =
                                native.value !== undefined
                                    ? native.value
                                    : native.getAttribute && native.getAttribute("value");
                            console.debug("control:event (native)", { control: id, value: val });
                            try {
                                window.__emitter_lastControl = { control: id, value: val, ts: Date.now() };
                            } catch (e) {}
                        } catch (e) {}
                    });
                    hostEl.__emitterNativeAttached = true;
                    return true;
                }
            } catch (e) {
                // ignore
            }
            return false;
        };

        if (findAndAttach()) return;
        let attempts = 4;
        const retry = () => {
            if (attempts-- <= 0 || hostEl.__emitterNativeAttached) return;
            if (findAndAttach()) return;
            setTimeout(retry, 250);
        };
        setTimeout(retry, 50);
    }

    controls.forEach((el) => attachNativeIfPresent(el));

    // If some controls weren't present at init (custom elements upgrade late
    // or live in parent document), retry resolution a few times to attach
    // listeners when they become available.
    const controlIds = [
        ["emit-rate", "emitter-pps"],
        ["emit-speed", "emitter-speed"],
        ["emit-spread", "emitter-spread"],
        ["emit-size", "emitter-size"],
        ["emit-life", "emitter-life"],
        ["emit-dir", "emitter-direction"],
        ["position"],
        ["gravity"],
        ["emitter-grav-z", "emitter-grav-z"]
    ];
    let retryAttempts = 8;
    const retryResolve = () => {
        if (retryAttempts-- <= 0) return;
        for (let ids of controlIds) {
            for (let id of ids) {
                try {
                    const el = findEl(id);
                    if (el && !el.__emitterNativeAttached) attachNativeIfPresent(el);
                } catch (e) {}
            }
        }
        if (retryAttempts > 0) setTimeout(retryResolve, 250);
    };
    setTimeout(retryResolve, 150);

    // Polling watcher fallback
    try {
        const watched = controls.map((el) => {
            const read = () =>
                el.value !== undefined ? String(el.value) : (el.getAttribute && String(el.getAttribute("value"))) || "";
            return { el, last: read(), read };
        });
        if (watched.length && !window.__emitterControlPollInterval) {
            window.__emitterControlPollInterval = setInterval(() => {
                for (let i = 0; i < watched.length; i++) {
                    const w = watched[i];
                    try {
                        const cur = w.read();
                        if (cur !== w.last) {
                            w.last = cur;
                            try {
                                const id = w.el.id || w.el.name || w.el.tagName;
                                console.debug("control:poll", { control: id, value: cur });
                            } catch (e) {}
                            applyControls();
                        }
                    } catch (e) {
                        // ignore
                    }
                }
            }, 150);
        }
    } catch (e) {
        /* ignore */
    }

    console.debug("setupControls resolved:", {
        emitRateEl: !!emitRateEl,
        emitSpreadEl: !!emitSpreadEl,
        emitDirEl: !!emitDirEl,
        emitSpeedEl: !!emitSpeedEl,
        positionControl: !!positionControl,
        gravityControl: !!gravityControl
    });

    if (directionControlEl) {
        directionControlEl.addEventListener("input", () => applyDirectionControl({ syncDegreeInput: true }));
        directionControlEl.addEventListener("change", () => applyDirectionControl({ syncDegreeInput: true }));
    }

    if (emitDirEl) {
        const syncDirectionControlFromDegrees = () => {
            if (!directionControlEl) return;
            const radians = (Number(emitDirEl.value) || 0) * (Math.PI / 180);
            const vector = directionRadiansToVectorString(radians);
            directionControlEl.value = vector;
            if (typeof directionControlEl.setAttribute === "function") {
                directionControlEl.setAttribute("value", vector);
            }
        };
        emitDirEl.addEventListener("input", syncDirectionControlFromDegrees);
        emitDirEl.addEventListener("change", syncDirectionControlFromDegrees);
    }

    if (burstBtn && burstInput) {
        burstBtn.addEventListener("click", () => {
            const n = Math.max(0, Math.floor(Number(burstInput.value || 0)));
            for (let i = 0; i < n; i++) {
                const randomDirection = emitter.direction + (Math.random() * emitter.spread - emitter.spread / 2);
                const randomSpeed = emitter.speed + Math.random() * emitter.speed * 0.1 - emitter.speed * 0.05;
                const randomSize = emitter.size + Math.random() * emitter.size * 0.2 - emitter.size * 0.1;
                const randomLifespan =
                    emitter.lifespan + Math.random() * emitter.lifespan * 0.2 - emitter.lifespan * 0.1;
                const velocityX = Math.cos(randomDirection) * randomSpeed;
                const velocityY = Math.sin(randomDirection) * randomSpeed;
                const particle = new Particle(
                    emitter.x,
                    emitter.y,
                    velocityX,
                    velocityY,
                    randomSize,
                    randomLifespan,
                    emitter.forces || [],
                    false
                );
                emitter.particles.push(particle);
            }
        });
    }

    if (startBtn) {
        startBtn.addEventListener("click", () => {
            running = true;
            if (startBtn && startBtn.id === "emitter-toggle") startBtn.textContent = "Emitter: on";
        });
    }
    if (stopBtn) {
        stopBtn.addEventListener("click", () => {
            running = false;
            if (startBtn && startBtn.id === "emitter-toggle") startBtn.textContent = "Emitter: off";
        });
    }
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            emitter.particles.length = 0;
        });
    }

    // If parent document is same-origin and hosts controls, forward their
    // change/input events into this iframe so `applyControls()` runs.
    try {
        if (!window.__emitterParentForwarded && window.parent && window.parent.document) {
            try {
                window.parent.document.addEventListener(
                    "change",
                    (ev) => {
                        try {
                            try {
                                const t = ev && ev.target;
                                let owner = t;
                                // climb up to find an ancestor with an id/name - handles native inputs
                                // inside custom elements in the parent document.
                                try {
                                    while (owner && owner !== window.parent.document && !(owner.id || owner.name)) {
                                        owner = owner.parentNode || owner.host || owner.parentElement;
                                    }
                                } catch (e) {
                                    owner = t;
                                }
                                const id = (owner && (owner.id || owner.name)) || (t && (t.id || t.name || t.tagName));
                                const val =
                                    t && (t.value !== undefined ? t.value : t.getAttribute && t.getAttribute("value"));
                                console.debug("control:event (parent)", { control: id, value: val });
                                try {
                                    const rec = { control: id, value: val, ts: Date.now() };
                                    try {
                                        // include emitter position snapshot for shift calculations
                                        rec.prevX = typeof emitter !== "undefined" ? emitter.x : undefined;
                                        rec.prevY = typeof emitter !== "undefined" ? emitter.y : undefined;
                                    } catch (e) {}
                                    window.__emitter_lastParentControl = rec;
                                    window.__emitter_lastControl = rec;
                                } catch (e) {}
                            } catch (e) {}
                            applyControls();
                        } catch (e) {}
                    },
                    true
                );
                window.parent.document.addEventListener(
                    "input",
                    (ev) => {
                        try {
                            try {
                                const t = ev && ev.target;
                                const id = t && (t.id || t.name || t.tagName);
                                const val =
                                    t && (t.value !== undefined ? t.value : t.getAttribute && t.getAttribute("value"));
                                console.debug("control:event (parent)", { control: id, value: val });
                                try {
                                    const rec = { control: id, value: val, ts: Date.now() };
                                    window.__emitter_lastParentControl = rec;
                                    window.__emitter_lastControl = rec;
                                } catch (e) {}
                            } catch (e) {}
                            applyControls();
                        } catch (e) {}
                    },
                    true
                );
                window.__emitterParentForwarded = true;
            } catch (e) {
                /* ignore cross-origin or attach errors */
            }
        }
    } catch (e) {
        /* ignore */
    }
}

/**
 * Executes loop.
 * @param {*} now - Parameter value.
 * @returns {*} Result of loop.
 */
function loop(now) {
    const dt = Math.max(0, (now - lastTime) / 1000);
    lastTime = now;
    if (running) {
        emitter.update(dt);
        const f = Number(emitter._friction || 0);
        if (f > 0) {
            const damp = Math.max(0, 1 - f * dt);
            for (let i = 0; i < emitter.particles.length; i++) {
                const p = emitter.particles[i];
                p.velocityX *= damp;
                p.velocityY *= damp;
            }
        }
    }

    if (ctx) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "#ffffff";
        emitter.draw(ctx);
        try {
            if (typeof window !== "undefined" && typeof window.updateOverlay === "function") {
                window.updateOverlay();
            }
        } catch (e) {
            /* ignore */
        }
        // Marker removed: no large red dot drawn on the emitter anymore.
    }

    requestAnimationFrame(loop);
}

/**
 * Executes init.
 * @returns {*} Result of init.
 */
function init() {
    // Ensure the canvas fills its parent element visually, then compute
    // the backing-store size from the parent's layout when we call `resize()`.
    try {
        if (canvas) {
            canvas.style.width = "100%";
            canvas.style.height = "100%";
        }
    } catch (e) {}
    resize();
    setupControls();
    if (canvas && typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
            resize();
        });
        resizeObserver.observe(canvas);
        try {
            // Also observe the parent container in case its size determines
            // the visible area for the canvas (fixes initial half-height issues).
            const parent = canvas.parentElement;
            if (parent && parent !== document.body) resizeObserver.observe(parent);
        } catch (e) {}
    }
    centerEmitterOnCanvas({ syncInputs: true });
    if (width > 2 && height > 2) didInitialCenter = true;
    if (emitSpreadEl && (emitSpreadEl.value === "" || Number(emitSpreadEl.value) > 20)) {
        emitSpreadEl.value = "10";
    }
    if (emitSizeEl && (emitSizeEl.value === "" || Number(emitSizeEl.value) > 3)) {
        emitSizeEl.value = "2";
    }
    if (directionControlEl && !directionControlEl.value) {
        directionControlEl.value = directionRadiansToVectorString(emitter.direction);
        directionControlEl.setAttribute("value", directionControlEl.value);
    }
    applyControls();

    try {
        if (typeof window !== "undefined") {
            window.emitter = emitter;
            window.__EMITTER_VERBOSE = false;
            window.__EMITTER_DEBUG_FORCE_CLEAR = false;
            window.applyControls = applyControls;
            window.setupEmitterControls = setupControls;
            window.__EMITTER_DEBUG_FORCE_CLEAR = false;
            window.applyControls = applyControls;
            window.setupEmitterControls = setupControls;
        }
    } catch (e) {
        /* ignore */
    }

    (function createOverlay() {
        if (typeof document === "undefined") return;
        if (document.getElementById("emitter-debug-overlay")) return;
        const ov = document.createElement("div");
        ov.id = "emitter-debug-overlay";
        ov.style.position = "fixed";
        ov.style.left = "8px";
        ov.style.top = "8px";
        ov.style.zIndex = "9999";
        ov.style.padding = "6px 8px";
        ov.style.background = "rgba(0,0,0,0.6)";
        ov.style.color = "#fff";
        ov.style.fontSize = "12px";
        ov.style.borderRadius = "4px";
        ov.style.pointerEvents = "none";
        ov.textContent = "emitter debug";
        document.body && document.body.appendChild(ov);
    })();

    function updateOverlay() {
        try {
            const ov = document.getElementById("emitter-debug-overlay");
            if (!ov) return;
            const parts = [];
            parts.push(`pps:${emitter.particlesPerSecond}`);
            parts.push(`speed:${Math.round(emitter.speed)}`);
            parts.push(`spread:${((emitter.spread * 180) / Math.PI).toFixed(1)}°`);
            parts.push(`size:${emitter.size}`);
            parts.push(`life:${emitter.lifespan}`);
            parts.push(`#:${emitter.particles.length}`);
            ov.textContent = parts.join(" | ");
        } catch (e) {
            /* ignore overlay errors */
        }
    }
    try {
        if (typeof window !== "undefined") window.updateOverlay = updateOverlay;
    } catch (e) {
        /* ignore */
    }

    requestAnimationFrame(() => {
        resize();
        if (!didInitialCenter && width > 2 && height > 2) {
            centerEmitterOnCanvas({ syncInputs: true });
            didInitialCenter = true;
            applyControls();
        }
    });
    // Retry once after a frame and once after a short timeout to ensure
    // layout has stabilized and the canvas fills its parent.
    try {
        requestAnimationFrame(() => resize());
        setTimeout(() => resize(), 120);
    } catch (e) {}
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

window.addEventListener("load", init);
