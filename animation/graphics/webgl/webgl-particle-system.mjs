/**
 * WebGL particle simulation + renderer using transform feedback.
 *
 * Responsibilities:
 * - Build and own GPU simulation/render pipelines.
 * - Expose runtime controls (orbit/repel/motion scales).
 * - Load/apply masks and sync particle state to stage buffers.
 *
 * @module Animation/Graphics/WebGL/WebGLParticleSystem
 */

import WebGL from "./Lib/WebGL.mjs";
const { VariableTypes } = WebGL;
import { Vector4D } from "../../properties/Vector.mjs";
import ParticleStateBuffer from "../particles/particle-state-buffer.mjs";
import AnimationValue from "../../properties/Value.mjs";
import TransformFeedback from "./Lib/TransformFeedback.mjs";
import EmitterAdapter from "./emitter-adapter.mjs";

import uiCard from "../../../ui/components/card.mjs";
import { FormBuilder, FormRow, InputBuilder, FormFieldSet } from "../../../forms/build/builder.mjs";

const REPEL_RADIUS_SCALE = 0.1;
/**
 * Creates a deterministic RNG when a seed is provided.
 *
 * @param {number} seed
 * @returns {() => number}
 */
function createSeededRandom(seed) {
    let state = (Math.floor(seed) || 1) >>> 0;
    return () => {
        state = (1664525 * state + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

/**
 * Parses hex color input to normalized RGBA floats.
 *
 * @param {string|number[]|Float32Array} input
 * @returns {[number, number, number, number]|null}
 */
function normalizeColorInput(input) {
    if (Array.isArray(input) || input instanceof Float32Array) {
        const r = Number(input[0]);
        const g = Number(input[1]);
        const b = Number(input[2]);
        const a = Number(input[3]);
        if ([r, g, b].every(Number.isFinite)) {
            return [
                Math.max(0, Math.min(1, r)),
                Math.max(0, Math.min(1, g)),
                Math.max(0, Math.min(1, b)),
                Number.isFinite(a) ? Math.max(0, Math.min(1, a)) : 1
            ];
        }
        return null;
    }
    if (typeof input !== "string") return null;
    const text = input.trim().toLowerCase();
    const full = text.match(/^#([0-9a-f]{6})$/);
    const short = text.match(/^#([0-9a-f]{3})$/);
    const hex = full
        ? full[1]
        : short
          ? `${short[1][0]}${short[1][0]}${short[1][1]}${short[1][1]}${short[1][2]}${short[1][2]}`
          : null;
    if (!hex) return null;
    return [
        parseInt(hex.slice(0, 2), 16) / 255,
        parseInt(hex.slice(2, 4), 16) / 255,
        parseInt(hex.slice(4, 6), 16) / 255,
        1
    ];
}

/**
 * GPU particle system wrapper.
 */
class WebGLParticleSystem {
    particleSize = 3.0;
    minParticleSize = 1.5;

    /**
     * @param {HTMLCanvasElement} canvas Render target.
     * @param {number} maxParticles Max active particle count.
     * @param {number} [emitRate=10] Reserved for emitter-driven usage.
     */
    constructor(canvas, maxParticles, emitRate = 10, options = {}) {
        this.canvas = canvas;
        this.maxParticles = maxParticles;
        this.emitRate = emitRate;
        this.particleSize = Math.max(0.1, Number(options.particleSize) || this.particleSize);
        this.minParticleSize = Math.max(0.1, Number(options.minParticleSize) || this.minParticleSize);
        this.particleColor = options.particleColor || "#ffffff";
        this.particleShape = ["square", "circle", "soft-circle"].includes(options.particleShape)
            ? options.particleShape
            : "square";

        // Interactive controls used by playground/component bindings.
        this.repel = new AnimationValue(0, { type: "int" });
        this.repelPoint = new Vector4D(0.0, 0.0, 0.0, 0.0);
        this.orbit = new AnimationValue(0, { type: "int" });
        this.orbitPoint = new Vector4D(0.0, 0.0, 0.0, 0.0);
        this.orbitFieldRadius = null;
        this.orbitEscape = 0;
        this.orbitEscapePush = 1;
        this.repelFieldRadius = null;

        // uMotion = [driftScale, orbitSpeedScale, repelStrengthScale, orbitPullScale]
        this.driftScale = 1.0;
        this.driftSpeedScale = 1.0;
        this.driftType = "relative";
        this.orbitSpeedScale = 1.0;
        this.repelStrengthScale = 1.0;
        this.orbitPullScale = 1.0;
        this.gravity = [0, 0, 0];
        this.friction = 0;
        this.cameraPan = { x: 0, y: 0 };
        this._previousCameraPan = { x: 0, y: 0 };
        this.cameraAngle = { yaw: 0, pitch: 0 };
        this._previousCameraAngle = { yaw: 0, pitch: 0 };
        this.cameraPanScale = 1.0;
        this.cameraAngleScale = 1.0;
        this.cameraDepthEffect = 1.0;
        this.cameraMaxStep = 0.04;
        this._snapshots = new Map();
        this._maskTransition = null;
        this.emitter = null;
        this.debugCrosshairMode = "none";
        this._debugCrosshairLayer = null;

        this.particles = new ParticleStateBuffer(maxParticles, canvas.width, canvas.height);
        // Keep baseline motion subtle so drift reads as wobble, not ballistic travel.
        this.particles.config.maxSpeed = 0.03;
        this.particles.setProjection("perspective", { fov: 45, near: 0.01, far: 20 });

        this.setupWebGL();
    }

    openDebugPanel() {
        juice.import("forms");
        if (this._debugPanel?.isConnected) {
            this._debugPanel.style.display = "";
            return this._debugPanel;
        }

        const card = document.createElement("ui-card");
        card.setAttribute("draggable", "true");
        card.setAttribute("width", 360);
        card.setAttribute("title", "Particle World Control");

        const form = new FormBuilder("particle-controls", "Particle System Controls");
        const storageKey = `juice:webgl-particle-system:debug-panel:${this.canvas?.id || "default"}`;
        let restoringDebugSettings = false;
        const readDebugSettings = () => {
            try {
                return JSON.parse(localStorage.getItem(storageKey) || "{}") || {};
            } catch (_error) {
                return {};
            }
        };
        const writeDebugSettings = (settings) => {
            try {
                localStorage.setItem(storageKey, JSON.stringify(settings));
            } catch (_error) {
                // Debug persistence should never break the particle system.
            }
        };
        const debugSettings = readDebugSettings();
        const readControlValue = (control) => {
            const tag = control.tagName?.toLowerCase();
            if (tag === "input-checkbox") return !!control.checked;
            return control.value;
        };
        const applyControlValue = (control, value) => {
            const tag = control.tagName?.toLowerCase();
            if (tag === "input-checkbox") {
                control.checked = value === true || value === "true" || value === "on";
            } else {
                control.value = value ?? "";
            }
        };
        const namedControls = (formEl) =>
            Array.from(formEl.querySelectorAll("[name]")).filter(
                (control) => !["input-button", "input-file"].includes(control.tagName?.toLowerCase())
            );
        const collectDebugSettings = (formEl) => {
            const next = {};
            namedControls(formEl).forEach((control) => {
                next[control.getAttribute("name")] = readControlValue(control);
            });
            return next;
        };
        const saveDebugSettings = (formEl) => {
            if (restoringDebugSettings || !formEl) return;
            writeDebugSettings(collectDebugSettings(formEl));
        };
        const restoreDebugSettings = (formEl) => {
            if (!formEl || !Object.keys(debugSettings).length) return;
            restoringDebugSettings = true;
            namedControls(formEl).forEach((control) => {
                const name = control.getAttribute("name");
                if (Object.prototype.hasOwnProperty.call(debugSettings, name)) {
                    applyControlValue(control, debugSettings[name]);
                }
            });
            restoringDebugSettings = false;
            namedControls(formEl).forEach((control) => {
                const name = control.getAttribute("name");
                if (Object.prototype.hasOwnProperty.call(debugSettings, name)) {
                    control.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
                }
            });
        };

        const valueOf = (event) => {
            const input = event.currentTarget;
            return input?.checked !== undefined && input.tagName?.toLowerCase() === "input-checkbox"
                ? input.checked
                : input?.value;
        };
        const onValue = (fn) => (event) => fn(valueOf(event), event.currentTarget, event);
        const number = (value, fallback = 0) => {
            const next = Number(value);
            return Number.isFinite(next) ? next : fallback;
        };
        const range = (name, label, min, max, value, step, precision, fn) =>
            InputBuilder.range(name, min, max, value, {
                label,
                step,
                precision,
                on: { input: onValue(fn), change: onValue(fn) }
            });
        const inputNumber = (name, label, value, step, fn) =>
            InputBuilder.number(name, value, {
                label,
                step,
                decimals: step < 1 ? 3 : 0,
                on: { input: onValue(fn), change: onValue(fn) }
            });
        const directionVector = (value) => {
            if (value && typeof value === "object") {
                const x = number(value.x, 1);
                const y = number(value.y, 0);
                const z = number(value.z, 0);
                return `${x},${y},${z}`;
            }
            const angle = number(value, 0);
            return `${Math.cos(angle)},${Math.sin(angle)},0`;
        };
        const parseDirectionVector = (value) => {
            if (value && typeof value === "object") {
                return { x: number(value.x, 1), y: number(value.y, 0), z: number(value.z, 0) };
            }
            const parts = String(value || "")
                .split(",")
                .map((part) => Number(part.trim()));
            if (parts.length >= 3 && parts.every(Number.isFinite)) {
                return { x: parts[0], y: parts[1], z: parts[2] };
            }
            return { x: 1, y: 0, z: 0 };
        };
        const parseRotationVector = (value) => {
            if (value && typeof value === "object") {
                return { x: number(value.x, 0), y: number(value.y, 0), z: number(value.z, 0) };
            }
            const parts = String(value || "")
                .split(",")
                .map((part) => Number(part.trim()));
            if (parts.length >= 3 && parts.every(Number.isFinite)) {
                return { x: parts[0], y: parts[1], z: parts[2] };
            }
            const scalar = Number(value);
            return { x: 0, y: 0, z: Number.isFinite(scalar) ? scalar : 0 };
        };
        const select = (name, label, value, options, fn) =>
            InputBuilder.select(name, value, {
                label,
                options,
                on: { input: onValue(fn), change: onValue(fn) }
            });
        const checkbox = (name, label, value, fn) =>
            InputBuilder.checkbox(name, value, {
                label,
                on: { input: onValue(fn), change: onValue(fn) }
            });
        const action = (name, label, fn) =>
            InputBuilder.button(name, label, {
                label,
                on: { "input-button-click": fn }
            });
        const fieldset = (label, controls) => new FormFieldSet(label, controls).build();
        const toggleSection = (label, toggle, controls, sync) => {
            const section = document.createElement("input-fieldset");
            section.setAttribute("label", label);
            const body = document.createElement("div");
            body.className = "particle-debug-section-body";
            controls.forEach((control) => body.appendChild(control));
            const refresh = () => {
                body.hidden = !toggle.checked;
                if (sync) sync();
            };
            toggle.addEventListener("input", refresh);
            toggle.addEventListener("change", refresh);
            section.append(toggle, body);
            requestAnimationFrame(refresh);
            return section;
        };
        let builtForm = null;
        const codeValue = (value) => JSON.stringify(value, null, 4);
        const buildDebugCode = () => {
            const values = collectDebugSettings(builtForm);
            const setting = (name, fallback = "") => values[name] ?? fallback;
            const numericSetting = (name, fallback = 0) => number(setting(name, fallback), fallback);
            const booleanSetting = (name, fallback = false) => {
                const value = setting(name, fallback);
                return value === true || value === "true" || value === "on";
            };
            const vectorSetting = (name, parser, fallback) => parser(setting(name, fallback));
            const maskSettings = {
                maskMode: setting("mask-mode", "replace"),
                scatter: numericSetting("mask-scatter", 0),
                scatterShape: setting("mask-scatter-shape", "box"),
                particleGap: Math.max(0, Math.floor(numericSetting("mask-load-gap", 0))),
                anchor: {
                    x: numericSetting("mask-anchor-x", 0),
                    y: numericSetting("mask-anchor-y", 0),
                    z: numericSetting("mask-anchor-z", -2),
                    space: "bounds"
                },
                rotation: vectorSetting("mask-rotation", parseRotationVector, "0,0,0"),
                transition: booleanSetting("mask-transition", true),
                transitionDuration: numericSetting("mask-transition-duration", 1400),
                transitionSpread: numericSetting("mask-transition-spread", 0)
            };
            const lines = [
                `const world = document.querySelector("particle-world");`,
                `const viewer = world.getViewer();`,
                ``,
                `viewer.setParticleRenderSize(${numericSetting("particle-size", this.particleSize)}, ${numericSetting("min-particle-size", this.minParticleSize)});`,
                `viewer.setParticleShape(${JSON.stringify(setting("particle-shape", this.particleShape))});`,
                `viewer.setParticleColor(${JSON.stringify(setting("particle-color", this.particleColor || "#ffffff"))});`,
                `viewer.setMotion(${codeValue({
                    drift: numericSetting("drift", this.driftScale),
                    driftSpeed: numericSetting("drift-speed", this.driftSpeedScale),
                    driftType: setting("drift-type", this.driftType),
                    orbitSpeed: numericSetting("orbit-speed", this.orbitSpeedScale),
                    orbitPull: numericSetting("orbit-pull", this.orbitPullScale),
                    orbitEscape: numericSetting("orbit-escape", this.orbitEscape),
                    orbitEscapePush: numericSetting("orbit-escape-push", this.orbitEscapePush),
                    repelStrength: numericSetting("repel-strength", this.repelStrengthScale)
                })});`,
                `viewer.setGravity(${codeValue([
                    numericSetting("gravity-x", this.gravity[0]),
                    numericSetting("gravity-y", this.gravity[1]),
                    numericSetting("gravity-z", this.gravity[2])
                ])});`,
                `viewer.setFriction(${numericSetting("friction", this.friction)});`,
                `viewer.setCameraPan(${numericSetting("camera-pan-x", this.cameraPan.x)}, ${numericSetting("camera-pan-y", this.cameraPan.y)});`,
                `viewer.setCameraAngle(${numericSetting("camera-yaw", this.cameraAngle.yaw)}, ${numericSetting("camera-pitch", this.cameraAngle.pitch)});`,
                `viewer.setCameraMotion(${codeValue({
                    panScale: numericSetting("camera-pan-scale", this.cameraPanScale),
                    angleScale: numericSetting("camera-angle-scale", this.cameraAngleScale),
                    depthEffect: numericSetting("camera-depth-effect", this.cameraDepthEffect),
                    maxStep: numericSetting("camera-max-step", this.cameraMaxStep)
                })});`,
                `viewer.setDebugCrosshair(${JSON.stringify(setting("crosshair-mode", this.debugCrosshairMode))});`,
                ``,
                `viewer.setOrbit(${booleanSetting("orbit-active", false)}, ${codeValue({
                    x: numericSetting("orbit-x", this.orbitPoint[0]),
                    y: numericSetting("orbit-y", this.orbitPoint[1]),
                    z: numericSetting("orbit-z", this.orbitPoint[2]),
                    radius: numericSetting("orbit-radius", this.orbitPoint[3] || 0.4),
                    fieldRadius: numericSetting("orbit-reach", this.orbitFieldRadius || 0) || null,
                    escape: numericSetting("orbit-escape", this.orbitEscape),
                    escapePush: numericSetting("orbit-escape-push", this.orbitEscapePush)
                })});`,
                `viewer.setRepel(${booleanSetting("repel-active", false)}, ${codeValue({
                    x: numericSetting("repel-x", this.repelPoint[0]),
                    y: numericSetting("repel-y", this.repelPoint[1]),
                    z: numericSetting("repel-z", this.repelPoint[2]),
                    radius: numericSetting("repel-radius", this.repelPoint[3] || 0.4),
                    fieldRadius: numericSetting("repel-reach", this.repelFieldRadius || 0) || null
                })});`
            ];
            const maskSource = String(setting("mask-source", "") || "").trim();
            if (maskSource) {
                lines.push(
                    ``,
                    `await world.loadMask(${JSON.stringify(maskSource)}, ${codeValue({
                        apply: booleanSetting("mask-load-apply", true),
                        preserveColor: booleanSetting("mask-load-preserve-color", false),
                        alphaThreshold: numericSetting("mask-load-alpha", 0.01),
                        x: numericSetting("mask-load-x", 0),
                        y: numericSetting("mask-load-y", 0),
                        ...maskSettings
                    })});`
                );
            } else if (setting("mask-index", "") !== "") {
                lines.push(``, `viewer.applyMask(${Math.floor(numericSetting("mask-index", 0))}, ${codeValue(maskSettings)});`);
            }

            if (booleanSetting("emitter-active", false)) {
                const emitterDirection = vectorSetting("emitter-direction", parseDirectionVector, "1,0,0");
                lines.push(
                    ``,
                    `viewer.addEmitter(${codeValue({
                        particlesPerSecond: numericSetting("emitter-rate", 10),
                        direction: Math.atan2(emitterDirection.y, emitterDirection.x),
                        directionVec: emitterDirection,
                        speed: numericSetting("emitter-speed", 0.2),
                        spread: numericSetting("emitter-spread", Math.PI / 8),
                        size: numericSetting("emitter-size", 1),
                        lifespan: numericSetting("emitter-life", 2),
                        x: numericSetting("emitter-x", 0),
                        y: numericSetting("emitter-y", 0),
                        z: numericSetting("emitter-z", -2)
                    })});`
                );
            } else {
                lines.push(``, `viewer.removeEmitter();`);
            }
            return lines.join("\n");
        };
        const showDebugCode = () => {
            const code = buildDebugCode();
            const panel = this._debugCodePanel?.isConnected ? this._debugCodePanel : document.createElement("div");
            if (!panel.isConnected) {
                panel.style.cssText = [
                    "position:fixed",
                    "right:16px",
                    "bottom:16px",
                    "z-index:99999",
                    "width:min(720px, calc(100vw - 32px))",
                    "max-height:calc(100vh - 32px)",
                    "display:flex",
                    "flex-direction:column",
                    "gap:8px",
                    "padding:10px",
                    "box-sizing:border-box",
                    "background:rgba(12, 18, 24, 0.96)",
                    "color:#f5f7fa",
                    "border:1px solid rgba(255,255,255,0.18)",
                    "border-radius:6px",
                    "box-shadow:0 12px 30px rgba(0,0,0,0.35)"
                ].join(";");
                const header = document.createElement("div");
                header.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;font:600 13px system-ui,sans-serif;";
                const title = document.createElement("span");
                title.textContent = "Particle world code";
                const close = document.createElement("button");
                close.type = "button";
                close.textContent = "Close";
                close.style.cssText = "font:12px system-ui,sans-serif;padding:4px 8px;border-radius:4px;border:1px solid rgba(255,255,255,0.28);background:transparent;color:inherit;cursor:pointer;";
                close.addEventListener("click", () => panel.remove());
                header.append(title, close);
                const pre = document.createElement("pre");
                pre.style.cssText = "margin:0;overflow:auto;white-space:pre;max-height:calc(100vh - 104px);font:12px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;";
                panel.append(header, pre);
                document.body.appendChild(panel);
                this._debugCodePanel = panel;
            }
            panel.querySelector("pre").textContent = code;
        };

        const applyRender = () => {
            this.setParticleRenderSize(this.particleSize, this.minParticleSize);
            this.setParticleShape(this.particleShape);
        };
        const applyMotion = () => {
            this.setMotion({
                drift: this.driftScale,
                driftSpeed: this.driftSpeedScale,
                driftType: this.driftType,
                orbitSpeed: this.orbitSpeedScale,
                orbitPull: this.orbitPullScale,
                orbitEscape: this.orbitEscape,
                orbitEscapePush: this.orbitEscapePush,
                repelStrength: this.repelStrengthScale
            });
        };
        const applyGravity = () => this.setGravity(this.gravity);
        const applyCamera = () => {
            this.setCameraPan(this.cameraPan.x, this.cameraPan.y);
            this.setCameraAngle(this.cameraAngle.yaw, this.cameraAngle.pitch);
            this.setCameraMotion({
                panScale: this.cameraPanScale,
                angleScale: this.cameraAngleScale,
                depthEffect: this.cameraDepthEffect,
                maxStep: this.cameraMaxStep
            });
        };
        const applyCrosshair = (value) => this.setDebugCrosshair(value);

        form.add(
            fieldset("Particles", [
                range("particle-size", "Point size", 0.1, 20, this.particleSize, 0.1, 2, (value) => {
                    this.particleSize = number(value, this.particleSize);
                    applyRender();
                }),
                range("min-particle-size", "Min point size", 0.1, 20, this.minParticleSize, 0.1, 2, (value) => {
                    this.minParticleSize = number(value, this.minParticleSize);
                    applyRender();
                }),
                select(
                    "particle-shape",
                    "Shape",
                    this.particleShape,
                    [
                        { value: "square", label: "Square" },
                        { value: "circle", label: "Circle" },
                        { value: "soft-circle", label: "Soft circle" }
                    ],
                    (value) => {
                        this.particleShape = value;
                        applyRender();
                    }
                ),
                InputBuilder.color("particle-color", this.particleColor || "#ffffff", {
                    label: "Particle color",
                    on: { input: onValue((value) => this.setParticleColor(value)), change: onValue((value) => this.setParticleColor(value)) }
                }),
                range("max-speed", "Initial max speed", 0, 1, this.particles?.config?.maxSpeed ?? 0.03, 0.005, 3, (value) => {
                    if (this.particles?.config) this.particles.config.maxSpeed = Math.max(0, number(value, 0));
                })
            ]),
            fieldset("Motion", [
                range("drift", "Drift", 0, 1, this.driftScale, 0.01, 2, (value) => {
                    this.driftScale = number(value, this.driftScale);
                    applyMotion();
                }),
                range("drift-speed", "Drift speed", 0, 5, this.driftSpeedScale, 0.05, 2, (value) => {
                    this.driftSpeedScale = number(value, this.driftSpeedScale);
                    applyMotion();
                }),
                select(
                    "drift-type",
                    "Drift type",
                    this.driftType,
                    [
                        { value: "relative", label: "Relative" },
                        { value: "absolute", label: "Absolute" }
                    ],
                    (value) => {
                        this.driftType = value;
                        applyMotion();
                    }
                ),
                range("friction", "Friction", 0, 1, this.friction, 0.01, 2, (value) => this.setFriction(value))
            ]),
            fieldset("Gravity", [
                range("gravity-x", "Gravity X", -2, 2, this.gravity[0], 0.01, 2, (value) => {
                    this.gravity[0] = number(value, 0);
                    applyGravity();
                }),
                range("gravity-y", "Gravity Y", -2, 2, this.gravity[1], 0.01, 2, (value) => {
                    this.gravity[1] = number(value, 0);
                    applyGravity();
                }),
                range("gravity-z", "Gravity Z", -2, 2, this.gravity[2], 0.01, 2, (value) => {
                    this.gravity[2] = number(value, 0);
                    applyGravity();
                })
            ]),
            fieldset("Debug", [
                select(
                    "crosshair-mode",
                    "Crosshair",
                    this.debugCrosshairMode,
                    [
                        { value: "none", label: "None" },
                        { value: "orbit", label: "Orbit" },
                        { value: "repel", label: "Repel" },
                        { value: "mask", label: "Mask" },
                        { value: "emitter", label: "Emitter" },
                        { value: "both", label: "Orbit + repel" },
                        { value: "all", label: "All" }
                    ],
                    applyCrosshair
                ),
                action("view-code", "View code", (event) => {
                    event.preventDefault();
                    showDebugCode();
                })
            ])
        );

        let orbitToggle;
        let repelToggle;
        const syncOrbit = () => {
            if (!orbitToggle) return;
            if (orbitToggle.checked && repelToggle?.checked) {
                repelToggle.checked = false;
                repelToggle.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
            }
            this.setOrbit(orbitToggle.checked, {
                x: this.orbitPoint[0],
                y: this.orbitPoint[1],
                z: this.orbitPoint[2],
                radius: this.orbitPoint[3],
                fieldRadius: this.orbitFieldRadius,
                escape: this.orbitEscape,
                escapePush: this.orbitEscapePush
            });
        };
        const syncRepel = () => {
            if (!repelToggle) return;
            if (repelToggle.checked && orbitToggle?.checked) {
                orbitToggle.checked = false;
                orbitToggle.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
            }
            this.setRepel(repelToggle.checked, {
                x: this.repelPoint[0],
                y: this.repelPoint[1],
                z: this.repelPoint[2],
                radius: this.repelPoint[3],
                fieldRadius: this.repelFieldRadius
            });
        };

        orbitToggle = checkbox("orbit-active", "Enable orbit", this.orbit.value === 1, syncOrbit);
        repelToggle = checkbox("repel-active", "Enable repel", this.repel.value === 1, syncRepel);

        form.add(
            toggleSection("Orbit", orbitToggle, [
                range("orbit-speed", "Speed", 0, 8, this.orbitSpeedScale, 0.05, 2, (value) => {
                    this.orbitSpeedScale = number(value, this.orbitSpeedScale);
                    applyMotion();
                }),
                range("orbit-pull", "Pull", 0, 8, this.orbitPullScale, 0.05, 2, (value) => {
                    this.orbitPullScale = number(value, this.orbitPullScale);
                    applyMotion();
                }),
                range("orbit-escape", "Escape", 0, 1, this.orbitEscape, 0.01, 2, (value) => {
                    this.orbitEscape = Math.max(0, Math.min(1, number(value, 0)));
                    syncOrbit();
                    applyMotion();
                }),
                range("orbit-escape-push", "Escape push", 0, 5, this.orbitEscapePush, 0.05, 2, (value) => {
                    this.orbitEscapePush = Math.max(0, number(value, 1));
                    syncOrbit();
                    applyMotion();
                }),
                range("orbit-x", "X", -10, 10, this.orbitPoint[0], 0.01, 2, (value) => {
                    this.orbitPoint[0] = number(value, 0);
                    syncOrbit();
                }),
                range("orbit-y", "Y", -10, 10, this.orbitPoint[1], 0.01, 2, (value) => {
                    this.orbitPoint[1] = number(value, 0);
                    syncOrbit();
                }),
                range("orbit-z", "Z", -20, 0, this.orbitPoint[2], 0.01, 2, (value) => {
                    this.orbitPoint[2] = number(value, -2);
                    syncOrbit();
                }),
                range("orbit-radius", "Radius", 0.01, 10, this.orbitPoint[3] || 0.4, 0.01, 2, (value) => {
                    this.orbitPoint[3] = Math.max(0.0001, number(value, 0.4));
                    syncOrbit();
                }),
                range("orbit-reach", "Reach", 0, 20, this.orbitFieldRadius || 0, 0.05, 2, (value) => {
                    const next = number(value, 0);
                    this.orbitFieldRadius = next > 0 ? next : null;
                    syncOrbit();
                })
            ], syncOrbit),
            toggleSection("Repel", repelToggle, [
                range("repel-strength", "Strength", 0, 8, this.repelStrengthScale, 0.05, 2, (value) => {
                    this.repelStrengthScale = number(value, this.repelStrengthScale);
                    applyMotion();
                }),
                range("repel-x", "X", -10, 10, this.repelPoint[0], 0.01, 2, (value) => {
                    this.repelPoint[0] = number(value, 0);
                    syncRepel();
                }),
                range("repel-y", "Y", -10, 10, this.repelPoint[1], 0.01, 2, (value) => {
                    this.repelPoint[1] = number(value, 0);
                    syncRepel();
                }),
                range("repel-z", "Z", -20, 0, this.repelPoint[2], 0.01, 2, (value) => {
                    this.repelPoint[2] = number(value, -2);
                    syncRepel();
                }),
                range("repel-radius", "Radius", 0.01, 10, this.repelPoint[3] || 0.4, 0.01, 2, (value) => {
                    this.repelPoint[3] = Math.max(0.0001, number(value, 0.4));
                    syncRepel();
                }),
                range("repel-reach", "Reach", 0, 20, this.repelFieldRadius || 0, 0.05, 2, (value) => {
                    const next = number(value, 0);
                    this.repelFieldRadius = next > 0 ? next : null;
                    syncRepel();
                })
            ], syncRepel)
        );

        const maskOptions = () =>
            (this.particles?.masks || []).map((mask, index) => ({
                value: String(index),
                label: `Mask ${index} (${Math.floor((mask?.points?.length || 0) / 2)} pts)`
            }));
        const refreshMaskSelect = () => {
            if (!maskSelectInput) return;
            maskSelectInput.setAttribute("options", JSON.stringify(maskOptions()));
            if (Number.isFinite(this.maskIndex)) maskSelectInput.value = String(this.maskIndex);
        };
        const selectedMaskIndex = () => {
            const selected = Number(maskSelectInput?.value);
            if (Number.isFinite(selected)) return Math.floor(selected);
            return Number.isFinite(this.maskIndex) ? Math.floor(this.maskIndex) : -1;
        };
        const applyCurrentMask = () => {
            const maskIndex = selectedMaskIndex();
            if (!Number.isFinite(maskIndex) || maskIndex < 0) return;
            this.applyMask(maskIndex, {
                reuseMaskRange: true,
                maskMode: maskModeInput.value,
                scatter: number(maskScatterInput.value, 0),
                scatterShape: maskScatterShapeInput.value,
                particleGap: Math.max(0, Math.floor(number(maskGapInput.value, 0))),
                anchor: {
                    x: number(maskAnchorXInput.value, 0),
                    y: number(maskAnchorYInput.value, 0),
                    z: number(maskAnchorZInput.value, -2),
                    space: "bounds"
                },
                rotation: parseRotationVector(maskRotationInput.value),
                transition: false,
                transitionDuration: number(maskTransitionDurationInput.value, 1400),
                transitionSpread: number(maskTransitionSpreadInput.value, 0)
            });
            refreshMaskSelect();
        };
        let maskSelectInput;
        maskSelectInput = select("mask-index", "Loaded mask", Number.isFinite(this.maskIndex) ? String(this.maskIndex) : "", maskOptions(), applyCurrentMask);
        const maskSourceInput = InputBuilder.text("mask-source", "", { label: "Source" });
        const maskModeInput = select(
            "mask-mode",
            "Mode",
            "replace",
            [
                { value: "replace", label: "Replace" },
                { value: "append", label: "Append" }
            ],
            applyCurrentMask
        );
        const maskScatterInput = range("mask-scatter", "Scatter", 0, 1, 0, 0.01, 2, applyCurrentMask);
        const maskScatterShapeInput = select(
            "mask-scatter-shape",
            "Scatter shape",
            "box",
            [
                { value: "box", label: "Box" },
                { value: "sphere", label: "Sphere" }
            ],
            applyCurrentMask
        );
        const maskAnchorXInput = range("mask-anchor-x", "Anchor X", -1, 1, 0, 0.01, 2, applyCurrentMask);
        const maskAnchorYInput = range("mask-anchor-y", "Anchor Y", -1, 1, 0, 0.01, 2, applyCurrentMask);
        const maskAnchorZInput = range("mask-anchor-z", "Anchor Z", -20, 0, -2, 0.01, 2, applyCurrentMask);
        const maskRotationInput = InputBuilder.rotation("mask-rotation", "0,0,0", {
            label: "Rotation",
            attributes: {
                "default-x": 0,
                "default-y": 0,
                "default-z": 0
            },
            on: { input: onValue(applyCurrentMask), change: onValue(applyCurrentMask) }
        });
        const maskTransitionInput = checkbox("mask-transition", "Transition", true, applyCurrentMask);
        const maskTransitionDurationInput = range("mask-transition-duration", "Transition ms", 0, 30000, 1400, 50, 0, applyCurrentMask);
        const maskTransitionSpreadInput = range("mask-transition-spread", "Transition spread", 0, 1, 0, 0.01, 2, applyCurrentMask);
        const maskLoadPreserveColorInput = checkbox("mask-load-preserve-color", "Load colors", false, () => {});
        const maskLoadApplyInput = checkbox("mask-load-apply", "Apply loaded mask", true, () => {});
        const maskLoadAlphaInput = range("mask-load-alpha", "Alpha threshold", 0, 1, 0.01, 0.01, 2, () => {});
        const maskGapInput = inputNumber("mask-load-gap", "Particle gap", 0, 1, applyCurrentMask);
        const maskLoadXInput = inputNumber("mask-load-x", "Image X", 0, 1, () => {});
        const maskLoadYInput = inputNumber("mask-load-y", "Image Y", 0, 1, () => {});
        let maskFileObjectUrl = null;
        const loadMaskFromSource = async (source) => {
            const result = await this.loadMask(source, {
                apply: maskLoadApplyInput.checked,
                preserveColor: maskLoadPreserveColorInput.checked,
                alphaThreshold: number(maskLoadAlphaInput.value, 0.01),
                particleGap: Math.max(0, Math.floor(number(maskGapInput.value, 0))),
                x: number(maskLoadXInput.value, 0),
                y: number(maskLoadYInput.value, 0),
                maskMode: maskModeInput.value,
                scatter: number(maskScatterInput.value, 0),
                scatterShape: maskScatterShapeInput.value,
                anchor: {
                    x: number(maskAnchorXInput.value, 0),
                    y: number(maskAnchorYInput.value, 0),
                    z: number(maskAnchorZInput.value, -2),
                    space: "bounds"
                },
                rotation: parseRotationVector(maskRotationInput.value),
                transition: maskTransitionInput.checked,
                transitionDuration: number(maskTransitionDurationInput.value, 1400),
                transitionSpread: number(maskTransitionSpreadInput.value, 0)
            });
            if (Number.isFinite(result?.maskIndex) && result.maskIndex >= 0) {
                maskSelectInput.value = String(result.maskIndex);
            }
            refreshMaskSelect();
            return result;
        };
        const maskFileInput = InputBuilder.file("mask-file", "", {
            label: "Local image",
            attributes: { accept: "image/*" },
            on: {
                change: async (event) => {
                    const file = event.currentTarget?.files?.[0] || event.currentTarget?.nativeInput?.files?.[0];
                    if (!file) return;
                    if (maskFileObjectUrl) URL.revokeObjectURL(maskFileObjectUrl);
                    maskFileObjectUrl = URL.createObjectURL(file);
                    await loadMaskFromSource(maskFileObjectUrl);
                    if (builtForm) saveDebugSettings(builtForm);
                }
            }
        });

        form.add(
            fieldset("Camera", [
                range("camera-pan-x", "Pan X", -10, 10, this.cameraPan.x, 0.01, 2, (value) => {
                    this.cameraPan.x = number(value, 0);
                    applyCamera();
                }),
                range("camera-pan-y", "Pan Y", -10, 10, this.cameraPan.y, 0.01, 2, (value) => {
                    this.cameraPan.y = number(value, 0);
                    applyCamera();
                }),
                range("camera-yaw", "Yaw", -10, 10, this.cameraAngle.yaw, 0.01, 2, (value) => {
                    this.cameraAngle.yaw = number(value, 0);
                    applyCamera();
                }),
                range("camera-pitch", "Pitch", -10, 10, this.cameraAngle.pitch, 0.01, 2, (value) => {
                    this.cameraAngle.pitch = number(value, 0);
                    applyCamera();
                }),
                range("camera-pan-scale", "Pan scale", 0, 5, this.cameraPanScale, 0.05, 2, (value) => {
                    this.cameraPanScale = number(value, 1);
                    applyCamera();
                }),
                range("camera-angle-scale", "Angle scale", 0, 5, this.cameraAngleScale, 0.05, 2, (value) => {
                    this.cameraAngleScale = number(value, 1);
                    applyCamera();
                }),
                range("camera-depth-effect", "Depth effect", 0, 4, this.cameraDepthEffect, 0.05, 2, (value) => {
                    this.cameraDepthEffect = number(value, 1);
                    applyCamera();
                }),
                range("camera-max-step", "Max step", 0.001, 1, this.cameraMaxStep, 0.001, 3, (value) => {
                    this.cameraMaxStep = Math.max(0.0001, number(value, 0.04));
                    applyCamera();
                })
            ]),
            fieldset("Mask", [
                maskSelectInput,
                maskSourceInput,
                maskFileInput,
                action("load-mask", "Load mask", async (event) => {
                    event.preventDefault();
                    const source = String(maskSourceInput.value || "").trim();
                    if (!source) return;
                    await loadMaskFromSource(source);
                }),
                maskLoadApplyInput,
                maskLoadPreserveColorInput,
                maskLoadAlphaInput,
                maskGapInput,
                maskLoadXInput,
                maskLoadYInput,
                maskModeInput,
                maskScatterInput,
                maskScatterShapeInput,
                maskAnchorXInput,
                maskAnchorYInput,
                maskAnchorZInput,
                maskRotationInput,
                maskTransitionInput,
                maskTransitionDurationInput,
                maskTransitionSpreadInput,
                action("clear-mask", "Clear mask", (event) => {
                    event.preventDefault();
                    this.clearMask();
                })
            ])
        );

        const emitterToggle = checkbox("emitter-active", "Enable emitter", !!this.emitter, () => applyEmitter());
        const emitterRateInput = inputNumber("emitter-rate", "Rate", this.emitter?.rate || 10, 1, () => applyEmitter());
        const emitterDirectionInput = InputBuilder.direction(
            "emitter-direction",
            directionVector(this.emitter?.directionVec || this.emitter?.direction || 0),
            {
                label: "Direction",
                attributes: {
                    "default-x": 1,
                    "default-y": 0,
                    "default-z": 0
                },
                on: { input: onValue(() => applyEmitter()), change: onValue(() => applyEmitter()) }
            }
        );
        const emitterSpeedInput = range("emitter-speed", "Speed", 0, 5, this.emitter?.speed || 0.2, 0.01, 2, () => applyEmitter());
        const emitterSpreadInput = range("emitter-spread", "Spread", 0, 6.283, this.emitter?.spread || Math.PI / 8, 0.01, 3, () => applyEmitter());
        const emitterSizeInput = range("emitter-size", "Size", 0.1, 10, this.emitter?.size || 1, 0.1, 2, () => applyEmitter());
        const emitterLifeInput = range("emitter-life", "Life", 0.1, 20, this.emitter?.life || 2, 0.1, 2, () => applyEmitter());
        const emitterXInput = range("emitter-x", "X", -10, 10, this.emitter?.position?.x || 0, 0.01, 2, () => applyEmitter());
        const emitterYInput = range("emitter-y", "Y", -10, 10, this.emitter?.position?.y || 0, 0.01, 2, () => applyEmitter());
        const emitterDefaultZ = Number.isFinite(Number(this.emitter?.position?.z))
            ? Number(this.emitter.position.z)
            : Number(this.orbitPoint[2]) || -2;
        const emitterZInput = range("emitter-z", "Z", -20, 0, emitterDefaultZ, 0.01, 2, () => applyEmitter());

        function emitterConfig() {
            const directionVec = parseDirectionVector(emitterDirectionInput.value);
            return {
                particlesPerSecond: number(emitterRateInput.value, 10),
                direction: Math.atan2(directionVec.y, directionVec.x),
                directionVec,
                speed: number(emitterSpeedInput.value, 0.2),
                spread: number(emitterSpreadInput.value, Math.PI / 8),
                size: number(emitterSizeInput.value, 1),
                lifespan: number(emitterLifeInput.value, 2),
                x: number(emitterXInput.value, 0),
                y: number(emitterYInput.value, 0),
                z: number(emitterZInput.value, -2)
            };
        }

        const applyEmitter = () => {
            if (!emitterToggle.checked) {
                this.removeEmitter();
                return;
            }
            this.addEmitter(emitterConfig());
        };

        form.add(
            toggleSection(
                "Emitter",
                emitterToggle,
                [
                    emitterRateInput,
                    emitterDirectionInput,
                    emitterSpeedInput,
                    emitterSpreadInput,
                    emitterSizeInput,
                    emitterLifeInput,
                    emitterXInput,
                    emitterYInput,
                    emitterZInput,
                    action("emitter-burst", "Burst 25", (event) => {
                        event.preventDefault();
                        if (!this.emitter) this.addEmitter(emitterConfig());
                        this.emitter?.burst?.(25);
                        this._syncStageFromParticles();
                    })
                ],
                applyEmitter
            ),
            fieldset("Actions", [
                range("scatter-min-push", "Scatter min", 0, 5, 0.1, 0.05, 2, () => {}),
                range("scatter-max-push", "Scatter max", 0, 5, 0.6, 0.05, 2, () => {}),
                range("scatter-jitter", "Scatter jitter", 0, 1, 0.05, 0.01, 2, () => {}),
                action("scatter-now", "Scatter", (event) => {
                    event.preventDefault();
                    const formEl = event.currentTarget.closest("form");
                    this.scatter({
                        minPush: number(formEl.elements["scatter-min-push"]?.value, 0.1),
                        maxPush: number(formEl.elements["scatter-max-push"]?.value, 0.6),
                        jitter: number(formEl.elements["scatter-jitter"]?.value, 0.05)
                    });
                }),
                range("jitter-amount", "Jitter amount", 0, 1, 0.05, 0.01, 2, () => {}),
                action("jitter-now", "Jitter", (event) => {
                    event.preventDefault();
                    const formEl = event.currentTarget.closest("form");
                    this.jitter(number(formEl.elements["jitter-amount"]?.value, 0.05));
                }),
                InputBuilder.text("snapshot-name", "debug", { label: "Snapshot name" }),
                action("capture-snapshot", "Capture", (event) => {
                    event.preventDefault();
                    const formEl = event.currentTarget.closest("form");
                    this.captureSnapshot(formEl.elements["snapshot-name"]?.value || "debug");
                }),
                action("restore-snapshot", "Restore", (event) => {
                    event.preventDefault();
                    const formEl = event.currentTarget.closest("form");
                    this.restoreSnapshot(formEl.elements["snapshot-name"]?.value || "debug");
                })
            ])
        );

        builtForm = form.build();
        builtForm.addEventListener("input", () => saveDebugSettings(builtForm));
        builtForm.addEventListener("change", () => saveDebugSettings(builtForm));
        card.appendChild(builtForm);
        document.body.appendChild(card);
        restoreDebugSettings(builtForm);
        saveDebugSettings(builtForm);
        this._debugPanel = card;
        return card;
    }

    /**
     * Smoothstep easing used for mask transitions.
     *
     * @private
     * @param {number} t
     * @returns {number}
     */
    _easeMaskTransition(t) {
        const clamped = Math.max(0, Math.min(1, Number(t) || 0));
        return clamped * clamped * (3 - 2 * clamped);
    }

    /**
     * Applies in-flight mask transition values to CPU/GPU buffers.
     *
     * @private
     * @param {number} nowMs RAF timestamp in milliseconds.
     * @returns {boolean} True while transition is active for this frame.
     */
    _applyMaskTransition(nowMs) {
        const transition = this._maskTransition;
        if (!transition) return false;

        if (!Number.isFinite(transition.startTimeMs)) {
            transition.startTimeMs = nowMs;
        }

        const elapsed = Math.max(0, nowMs - transition.startTimeMs);
        const durationMs = Math.max(1, Number(transition.durationMs) || 1);
        const spread = Math.max(0, Math.min(1, Number(transition.spread) || 0));
        const totalDurationMs = durationMs * (1 + spread);
        const positionCount = Math.min(
            this.particles.positions.length,
            transition.fromPositions.length,
            transition.toPositions.length
        );
        const colorCount = Math.min(
            this.particles.colors.length,
            transition.fromColors.length,
            transition.toColors.length
        );

        for (let i = 0; i < positionCount; i += 1) {
            const from = transition.fromPositions[i];
            const to = transition.toPositions[i];
            const particleIndex = Math.floor(i / 3);
            const delay = spread ? createSeededRandom((particleIndex + 1) * 2654435761)() * durationMs * spread : 0;
            const progress = Math.max(0, Math.min(1, (elapsed - delay) / durationMs));
            const eased = this._easeMaskTransition(progress);
            this.particles.positions[i] = from + (to - from) * eased;
        }

        for (let i = 0; i < colorCount; i += 1) {
            const from = transition.fromColors[i];
            const to = transition.toColors[i];
            if (i % 4 === 3) {
                this.particles.colors[i] = to;
            } else {
                const particleIndex = Math.floor(i / 4);
                const delay = spread ? createSeededRandom((particleIndex + 1) * 2654435761)() * durationMs * spread : 0;
                const progress = Math.max(0, Math.min(1, (elapsed - delay) / durationMs));
                const eased = this._easeMaskTransition(progress);
                this.particles.colors[i] = from + (to - from) * eased;
            }
        }

        if (Number.isFinite(transition.count) && transition.count >= 0) {
            this.particles.count = Math.max(0, Math.min(this.maxParticles, Math.floor(transition.count)));
        }

        this._syncStageFromParticles();

        if (elapsed >= totalDurationMs) {
            this.particles.positions.set(transition.toPositions);
            this.particles.colors.set(transition.toColors);
            if (Number.isFinite(transition.count) && transition.count >= 0) {
                this.particles.count = Math.max(0, Math.min(this.maxParticles, Math.floor(transition.count)));
            }
            this._syncStageFromParticles();
            this._maskTransition = null;
            return false;
        }

        return true;
    }

    /**
     * Builds simulation and render pipelines.
     */
    setupWebGL() {
        this.webgl = new WebGL(this.canvas);
        const { gl, shaders } = this.webgl;
        this.gl = gl;

        // Seed initial particle data on CPU.
        this.particles.build();
        this._refreshHomeStateFromDestinations();

        // Build transform-feedback simulation pipeline.
        this.feedback = new TransformFeedback(this.maxParticles, gl);

        this.feedback.addFunction(
            "vec4",
            "calculateVisibleDimensions",
            ["mat4 projectionMatrix", "float depth"],
            `
            float near = -1.0 / projectionMatrix[2][2];
            float far = projectionMatrix[2][3] / (1.0 + projectionMatrix[2][2]);

            if (depth < near || depth > far) {
                return vec4(0.0);
            }

            // For a standard perspective matrix:
            // projectionMatrix[1][1] = 1 / tan(fovY / 2)
            // projectionMatrix[0][0] = projectionMatrix[1][1] / aspect
            // So visible half-extents at a given depth are depth / m11 and depth / m00.
            float halfHeight = depth / projectionMatrix[1][1];
            float halfWidth = depth / projectionMatrix[0][0];

            return vec4(-halfWidth, halfWidth, halfHeight, -halfHeight);
            `
        );

        this.feedback.addFunction("float", "random", ["float x"], "return fract(sin(x) * 43758.5453123);");

        this.uTargetPoint = this.feedback.addUniform("uTargetPoint", VariableTypes.FLOAT_VEC4, [0.0, 0.0, -2.0, 0.0], {
            debug: false
        });
        this.uScene = this.feedback.addUniform(
            "uScene",
            VariableTypes.FLOAT_VEC4,
            [Number(this.canvas.width), Number(this.canvas.height), 0.0, -1.0],
            { debug: false, clearGLErrors: false }
        );
        this.uMotion = this.feedback.addUniform("uMotion", VariableTypes.FLOAT_VEC4, [1.0, 1.0, 1.0, 0.0]);
        this.uDriftSpeed = this.feedback.addUniform("uDriftSpeed", VariableTypes.FLOAT, 1.0);
        this.uDriftMode = this.feedback.addUniform("uDriftMode", VariableTypes.FLOAT, 0.0);
        this.uCameraDelta = this.feedback.addUniform("uCameraDelta", VariableTypes.FLOAT_VEC4, [0.0, 0.0, 0.0, 0.0]);
        this.uCameraConfig = this.feedback.addUniform("uCameraConfig", VariableTypes.FLOAT_VEC4, [1.0, 1.0, 1.0, 0.0]);
        this.projectionMatrix = this.feedback.addUniform(
            "uProjectionMatrix",
            VariableTypes.FLOAT_MAT4,
            this.particles.projection.matrix
        );
        this.uRepel = this.feedback.addUniform("uRepel", VariableTypes.BOOL, false);
        this.uOrbit = this.feedback.addUniform("uOrbit", VariableTypes.BOOL, false);
        this.uOrbitFieldRadius = this.feedback.addUniform("uOrbitFieldRadius", VariableTypes.FLOAT, 1.2);
        this.uOrbitEscape = this.feedback.addUniform("uOrbitEscape", VariableTypes.FLOAT_VEC2, [0.0, 1.0]);
        this.uRepelFieldRadius = this.feedback.addUniform("uRepelFieldRadius", VariableTypes.FLOAT, 1.2);
        // Gravity (world units/sec^2) and friction (damping per second)
        this.uGravity = this.feedback.addUniform("uGravity", VariableTypes.FLOAT_VEC3, [0.0, 0.0, 0.0]);
        this.uFriction = this.feedback.addUniform("uFriction", VariableTypes.FLOAT, 0.0);

        this.feedbackPosition = this.feedback.addVariable(
            "aPosition",
            VariableTypes.FLOAT_VEC3,
            this.particles.positions,
            { debug: false }
        );
        this.feedbackVelocity = this.feedback.addVariable(
            "aVelocity",
            VariableTypes.FLOAT_VEC3,
            this.particles.velocities,
            { debug: false }
        );
        this.feedbackState = this.feedback.addVariable("aState", VariableTypes.FLOAT_VEC4, this.particles.states, {});
        this.feedbackColor = this.feedback.addVariable("aColor", VariableTypes.FLOAT_VEC4, this.particles.colors, {
            debug: false
        });

        // Simulation shader:
        // - orbit/repel around uTargetPoint
        // - light drift when no force mode is enabled
        // - wrap to frustum bounds
        this.feedback.setScript(`
            int index = gl_VertexID;

            float time = uScene[2];
            float delta = uScene[3];
            bool gravityActive = length(uGravity) > 0.000001;

            float near = -1.0 / uProjectionMatrix[2][2];
            float far = uProjectionMatrix[2][3] / (1.0 + uProjectionMatrix[2][2]);

            vec3 position = aPosition;
            vec3 velocity = aVelocity;
            float particleAge = aState[1];
            vec3 home = vec3(aState[2], aState[3], aState[0]);
            if (home.z > -near || home.z < -far) {
                home.z = position.z;
            }
            float absoluteDriftX = position.x;
            float absoluteDriftY = position.y;
            bool driftAbsolute = false;

            vec4 bounds = calculateVisibleDimensions(uProjectionMatrix, -position.z);
            float boundLeft = bounds[0];
            float boundRight = bounds[1];
            float boundTop = bounds[2];
            float boundBottom = bounds[3];

            if (uRepel) {
                vec3 target = vec3(uTargetPoint.x, uTargetPoint.y, uTargetPoint.z);
                float targetRadius = max(0.0001, uTargetPoint.w);
                float fieldRadius = max(targetRadius, uRepelFieldRadius);

                vec3 away = position - target;
                float targetDistance = length(away);

                if (targetDistance < 0.0001) {
                    away = vec3(
                        sin(time + float(index) * 0.17),
                        cos(time * 1.21 + float(index) * 0.11),
                        0.0
                    );
                    targetDistance = length(away);
                }

                vec3 repelDirection = away / targetDistance;
                if (targetDistance <= fieldRadius) {
                    float insideRadius = 1.0 - step(targetRadius, targetDistance);
                    float falloff = 1.0 - smoothstep(targetRadius, fieldRadius, targetDistance);
                    float influence = max(insideRadius, falloff);
                    float radiusCorrection = max(0.0, targetRadius - targetDistance);
                    float softDisplacement = falloff * targetRadius * 0.45;
                    vec3 displacedHome = home + repelDirection * (radiusCorrection + softDisplacement) * uMotion.z;
                    float repelLerp = clamp(delta * (8.0 + 18.0 * influence), 0.0, 0.35);
                    position += (displacedHome - position) * repelLerp;
                    position.z += (target.z - position.z) * (0.004 + 0.012 * influence);
                    float settle = clamp(delta * (5.0 + 5.0 * (1.0 - influence)), 0.0, 1.0);
                    velocity *= (1.0 - settle);
                } else {
                    vec3 toHome = home - position;
                    float homeDistance = length(toHome);
                    if (homeDistance > 0.0001) {
                        float homeLerp = 1.0 - exp(-max(0.0, delta) * 5.0);
                        homeLerp = clamp(homeLerp, 0.0, 0.18);
                        position += toHome * homeLerp;
                    }
                    float settle = clamp(delta * 8.0, 0.0, 1.0);
                    velocity *= (1.0 - settle);
                }

            } else if (uOrbit) {
                vec3 target = vec3(uTargetPoint.x, uTargetPoint.y, uTargetPoint.z);
                float targetRadius = max(0.02, uTargetPoint.w);
                float fieldRadius = max(targetRadius, uOrbitFieldRadius);
                // Orbit reach is evaluated in XY so depth variation doesn't disqualify most particles.
                float homeDistanceToTarget = length(home.xy - target.xy);
                bool orbitEligible = homeDistanceToTarget <= fieldRadius;

                vec3 rel = position - target;
                float d = length(rel);

                if (orbitEligible) {
                    if (d < 0.0001) {
                        float a = float(index) * 12.9898;
                        rel = normalize(vec3(
                            fract(sin(a) * 43758.5453) * 2.0 - 1.0,
                            fract(sin(a * 1.31) * 28001.8384) * 2.0 - 1.0,
                            fract(sin(a * 1.73) * 13976.1239) * 2.0 - 1.0
                        )) * targetRadius;
                        d = length(rel);
                    }

                    vec3 dir = rel / d;
                    float pullScale = max(0.0, uMotion.w);
                    float escapeSeed = random(float(index) * 19.19 + 23.0);
                    float escapeActive = step(escapeSeed, clamp(uOrbitEscape.x, 0.0, 1.0));
                    float fieldInfluence = 1.0 - smoothstep(targetRadius, fieldRadius, d);
                    float convergeRate = (0.04 + (0.18 * pullScale)) * max(0.02, fieldInfluence);
                    convergeRate *= mix(1.0, 0.12, escapeActive);
                    float radialLerp = 1.0 - exp(-convergeRate * max(0.0, delta));
                    radialLerp = clamp(radialLerp, 0.0, 0.05 * max(0.1, fieldInfluence));
                    float desiredRadius = mix(d, targetRadius, radialLerp);

                    position = target + dir * desiredRadius;
                    rel = position - target;
                    d = max(0.0001, length(rel));
                    dir = rel / d;

                    float seed = float(index) + 1.0;
                    vec3 axis = normalize(vec3(
                        sin(seed * 0.73),
                        cos(seed * 1.11),
                        sin(seed * 1.37 + 2.1)
                    ));
                    vec3 tangent = cross(axis, dir);
                    float tangentLen = length(tangent);
                    if (tangentLen < 0.0001) {
                        tangent = cross(vec3(0.0, 1.0, 0.0), dir);
                        tangentLen = length(tangent);
                        if (tangentLen < 0.0001) {
                            tangent = cross(vec3(1.0, 0.0, 0.0), dir);
                            tangentLen = length(tangent);
                        }
                    }
                    tangent = tangent / max(0.0001, tangentLen);

                    float orbitSpeed = (0.09 + 0.21 * random(float(index) + 13.0)) * uMotion.y;
                    float ringLock = 1.0 - clamp(abs(desiredRadius - targetRadius) / (targetRadius * 8.0), 0.0, 1.0);
                    float flare = pow(max(0.0, sin(time * (0.45 + escapeSeed * 1.35) + escapeSeed * 6.2831853)), 10.0);
                    float escapePush = escapeActive * max(0.0, uOrbitEscape.y) * (0.012 + flare * 0.085) * delta;
                    position += tangent * orbitSpeed * delta * (0.2 + 0.8 * ringLock) * max(0.0, fieldInfluence);
                    position += dir * escapePush * max(0.0, fieldInfluence);
                    float orbitSettle = clamp(delta * (8.0 + 12.0 * max(0.0, fieldInfluence)), 0.0, 1.0);
                    velocity *= (1.0 - orbitSettle * (1.0 - escapeActive * 0.65));

                } else {
                    // Outside orbit reach (based on original/home position), ease back home.
                    vec3 toHome = home - position;
                    float homeDistance = length(toHome);
                    if (homeDistance > 0.0001) {
                        float homeLerp = 1.0 - exp(-max(0.0, delta) * 5.0);
                        homeLerp = clamp(homeLerp, 0.0, 0.2);
                        position += toHome * homeLerp;
                    }
                    float settle = clamp(delta * 8.0, 0.0, 1.0);
                    velocity *= (1.0 - settle);
                }
            } else if (!gravityActive) {
                // Orbit is off: settle particles back toward home.
                vec3 toHome = home - position;
                float homeDistance = length(toHome);
                if (homeDistance > 0.0001) {
                    float homeLerp = 1.0 - exp(-max(0.0, delta) * 6.0);
                    homeLerp = clamp(homeLerp, 0.0, 0.25);
                    position += toHome * homeLerp;
                }
                float settle = clamp(delta * 10.0, 0.0, 1.0);
                velocity *= (1.0 - settle);

                float driftSeed = float(index) * 0.013;
                float drift = 0.0045 * uMotion.x;
                float driftSpeed = max(0.0, uDriftSpeed);
                float driftTime = time * max(0.001, driftSpeed);
                float driftAmount = drift * step(0.0001, driftSpeed);
                float wobbleX = sin(driftTime * 1.9 + driftSeed) + sin(driftTime * 0.63 + driftSeed * 2.3) * 0.45;
                float wobbleY = cos(driftTime * 1.7 + driftSeed * 1.7) + cos(driftTime * 0.57 + driftSeed * 2.9) * 0.45;
                if (uDriftMode >= 0.5) {
                    // Absolute: oscillate around the particle's anchor (starting XY).
                    absoluteDriftX = home.x + wobbleX * driftAmount;
                    absoluteDriftY = home.y + wobbleY * driftAmount;
                    position.x = absoluteDriftX;
                    position.y = absoluteDriftY;
                    driftAbsolute = true;
                } else {
                    // Relative: apply drift as velocity so low speeds move slowly instead of frame-jittering.
                    float driftStep = driftAmount * driftSpeed * max(0.0, delta);
                    position.x += wobbleX * driftStep;
                    position.y += wobbleY * driftStep;
                }
            }

            float cameraActive = step(0.000001, abs(uCameraDelta.x) + abs(uCameraDelta.y) + abs(uCameraDelta.z) + abs(uCameraDelta.w));
            float normalizedDepth = clamp((-position.z - near) / max(0.0001, far - near), 0.0, 1.0);
            float depthParallax = mix(1.6, 0.35, normalizedDepth);
            float depthEffect = max(0.0, uCameraConfig.z);
            float panDepth = mix(1.0, depthParallax, clamp(depthEffect, 0.0, 1.0));
            vec2 cameraShift = uCameraDelta.xy * uCameraConfig.x * panDepth;
            cameraShift *= cameraActive;
            position.xy += cameraShift;
            home.xy += cameraShift;
            if (driftAbsolute) {
                absoluteDriftX += cameraShift.x;
                absoluteDriftY += cameraShift.y;
            }

            // Integrate velocity with gravity and friction.
            velocity += uGravity * delta;
            float damp = clamp(uFriction * delta, 0.0, 1.0);
            velocity = velocity * (1.0 - damp);
            if (driftAbsolute) {
                // Keep absolute drift centered on anchor in XY.
                velocity.x = 0.0;
                velocity.y = 0.0;
            }
            position += velocity * delta;
            if (driftAbsolute) {
                position.x = absoluteDriftX;
                position.y = absoluteDriftY;
            }

            bool wrapActive = !gravityActive && !uRepel && !uOrbit;

            if (wrapActive && position.x < boundLeft) {
                position.x = boundRight;
                home.x = position.x;
            }
            if (wrapActive && position.x > boundRight) {
                position.x = boundLeft;
                home.x = position.x;
            }
            if (wrapActive && position.y < boundBottom) {
                position.y = boundTop;
                home.y = position.y;
            }
            if (wrapActive && position.y > boundTop) {
                position.y = boundBottom;
                home.y = position.y;
            }
            if (wrapActive && position.z < -far) {
                position.z = -near;
                home.z = position.z;
            }
            if (wrapActive && position.z > -near) {
                position.z = -far;
                home.z = position.z;
            }

            aPositionOut = position;
            aVelocityOut = velocity;
            aStateOut = vec4(home.z, particleAge + delta, home.x, home.y);
            aColorOut = aColor;
        `);

        this.feedback.build();

        // Build render shader.
        const { vertex, fragment } = shaders;
        vertex.setPrecision("high", "float");

        this.aState = vertex.addInput(
            "aState",
            VariableTypes.FLOAT_VEC4,
            new Float32Array(this.particles.maxCount * 4)
        );
        this.feedbackState.addChild(this.aState);

        this.aPosition = vertex.addInput("aPosition", VariableTypes.FLOAT_VEC3);
        this.feedbackPosition.addChild(this.aPosition);
        this.aVelocity = vertex.addInput("aVelocity", VariableTypes.FLOAT_VEC3, this.particles.velocities);
        this.feedbackVelocity.addChild(this.aVelocity);
        this.aColor = vertex.addInput("aColor", VariableTypes.FLOAT_VEC4, this.particles.colors);
        this.feedbackColor.addChild(this.aColor);

        vertex.addOutput("particleStateColor", VariableTypes.FLOAT_VEC4);
        this.uProjectionMatrix = vertex.addUniform(
            "uProjectionMatrix",
            VariableTypes.FLOAT_MAT4,
            this.particles.projection.matrix
        );
        this.uRenderCamera = vertex.addUniform("uRenderCamera", VariableTypes.FLOAT_VEC4, [0.0, 0.0, 1.0, 1.0]);
        this.uRenderWrap = vertex.addUniform("uRenderWrap", VariableTypes.FLOAT, 1.0);
        this.uPointSize = vertex.addUniform("uPointSize", VariableTypes.FLOAT_VEC2, [
            this.particleSize,
            this.minParticleSize
        ]);
        this.uParticleShape = fragment.addUniform("uParticleShape", VariableTypes.INT, this._particleShapeMode());

        vertex.main(`
            vec3 renderPosition = aPosition;
            float nearPlane = -1.0 / uProjectionMatrix[2][2];
            float farPlane = uProjectionMatrix[2][3] / (1.0 + uProjectionMatrix[2][2]);
            float renderDepth = max(nearPlane, -renderPosition.z);
            float halfHeight = renderDepth / uProjectionMatrix[1][1];
            float halfWidth = renderDepth / uProjectionMatrix[0][0];
            float normalizedDepth = clamp((renderDepth - nearPlane) / max(0.0001, farPlane - nearPlane), 0.0, 1.0);
            float depthEffect = clamp(max(0.0, uRenderCamera.w), 0.0, 4.0);
            float parallax = mix(1.0 + depthEffect * 0.18, max(0.45, 1.0 - depthEffect * 0.1), normalizedDepth);
            renderPosition.xy +=
                uRenderCamera.xy *
                vec2(halfWidth, halfHeight) *
                max(0.0, uRenderCamera.z) *
                0.08 *
                parallax;
            if (uRenderWrap > 0.5) {
                vec2 renderSize = max(vec2(0.0001), vec2(halfWidth * 2.0, halfHeight * 2.0));
                renderPosition.x = mod(renderPosition.x + halfWidth, renderSize.x) - halfWidth;
                renderPosition.y = mod(renderPosition.y + halfHeight, renderSize.y) - halfHeight;
            }
            gl_Position = uProjectionMatrix * vec4(renderPosition, 1.0);
            float depth = max(0.2, abs(renderPosition.z));
            gl_PointSize = max(uPointSize.y, uPointSize.x / depth);
            particleStateColor = aColor;
        `);

        fragment.setPrecision("high", "float");
        fragment.addOutput("fragColor", VariableTypes.FLOAT_VEC4);
        fragment.addInput("particleStateColor", VariableTypes.FLOAT_VEC4);
        fragment.main(`
            if (particleStateColor.a <= 0.001) discard;
            vec2 particleUv = gl_PointCoord - vec2(0.5);
            float particleDistance = length(particleUv);
            if (uParticleShape == 1 && particleDistance > 0.5) discard;

            float shapeAlpha = 1.0;
            if (uParticleShape == 2) {
                shapeAlpha = smoothstep(0.5, 0.38, particleDistance);
                if (shapeAlpha <= 0.001) discard;
            }

            fragColor = vec4(particleStateColor.rgb, particleStateColor.a * shapeAlpha);
        `);

        this.program = this.webgl.build();

        // Keep TF draw count aligned to active particles.
        this.feedback.points = Math.max(0, Math.min(this.maxParticles, this.particles.count || 0));
        this.captureSnapshot("origin");
    }

    /**
     * Uploads CPU particle arrays to both TF ping-pong buffers.
     *
     * @private
     * @param {*} variable Feedback variable containing read/write buffers.
     * @param {Float32Array|number[]} data Source data.
     */
    _syncFeedbackVariable(variable, data) {
        if (!variable || !variable.buffer || !this.gl) return;
        const payload = data instanceof Float32Array ? data : new Float32Array(data || []);
        variable._value = payload;

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, variable.buffer.read);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, payload, this.gl.DYNAMIC_DRAW);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, variable.buffer.write);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, payload, this.gl.DYNAMIC_DRAW);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    }

    /**
     * Stores each active particle's home position in state channels used by the shader.
     * Encoding: state.x = home.z, state.z = home.x, state.w = home.y.
     *
     * @private
     */
    _refreshHomeStateFromDestinations() {
        if (!this.particles?.states || !this.particles?.destinations || !this.particles?.positions) return;
        const count = Math.max(0, Math.min(this.maxParticles, this.particles.count || 0));
        for (let i = 0; i < count; i += 1) {
            const i3 = i * 3;
            const i4 = i * 4;
            const homeX = Number.isFinite(this.particles.destinations[i3])
                ? this.particles.destinations[i3]
                : this.particles.positions[i3];
            const homeY = Number.isFinite(this.particles.destinations[i3 + 1])
                ? this.particles.destinations[i3 + 1]
                : this.particles.positions[i3 + 1];
            const homeZ = Number.isFinite(this.particles.destinations[i3 + 2])
                ? this.particles.destinations[i3 + 2]
                : this.particles.positions[i3 + 2];
            this.particles.states[i4] = homeZ;
            this.particles.states[i4 + 2] = homeX;
            this.particles.states[i4 + 3] = homeY;
        }
    }

    /**
     * Syncs current CPU particle data into GPU simulation buffers.
     *
     * @private
     */
    _syncStageFromParticles() {
        this._refreshHomeStateFromDestinations();
        this._syncFeedbackVariable(this.feedbackPosition, this.particles.positions);
        this._syncFeedbackVariable(this.feedbackVelocity, this.particles.velocities);
        this._syncFeedbackVariable(this.feedbackState, this.particles.states);
        this._syncFeedbackVariable(this.feedbackColor, this.particles.colors);
        if (this.feedback) {
            this.feedback.points = Math.max(0, Math.min(this.maxParticles, this.particles.count || 0));
        }
    }

    /**
     * Refreshes and uploads only encoded home state channels.
     *
     * @private
     */
    _syncHomeState() {
        this._refreshHomeStateFromDestinations();
        this._syncFeedbackVariable(this.feedbackState, this.particles.states);
    }

    /**
     * Set gravity vector used by the simulation shader.
     * @param {number[]} vec3
     */
    setGravity(vec3) {
        this.gravity = [Number(vec3[0] || 0), Number(vec3[1] || 0), Number(vec3[2] || 0)];
        if (this.uGravity) this.uGravity.value = this.gravity;
    }

    /**
     * Set friction (damping per second) used by the simulation shader.
     * @param {number} value
     */
    setFriction(value) {
        this.friction = Number(value) || 0;
        if (this.uFriction) this.uFriction.value = this.friction;
    }

    /**
     * Sets a single default particle color.
     * Also updates particle state defaults used by rebuilds/masks in non-preserve mode.
     *
     * @param {string|number[]|Float32Array} color
     */
    setParticleColor(color) {
        const resolved = normalizeColorInput(color);
        if (!resolved || !this.particles?.colors) return;
        if (typeof color === "string") this.particleColor = color;

        if (typeof this.particles.setStateDefaults === "function") {
            this.particles.setStateDefaults({ color: resolved.slice() });
        }

        const count = Math.max(0, Math.min(this.maxParticles, this.particles.count || 0));
        for (let i = 0; i < count; i += 1) {
            const i4 = i * 4;
            const alpha = Number.isFinite(this.particles.colors[i4 + 3]) ? this.particles.colors[i4 + 3] : resolved[3];
            this.particles.colors[i4] = resolved[0];
            this.particles.colors[i4 + 1] = resolved[1];
            this.particles.colors[i4 + 2] = resolved[2];
            this.particles.colors[i4 + 3] = alpha;
        }

        this._syncFeedbackVariable(this.feedbackColor, this.particles.colors);
    }

    /**
     * Sets render point size controls without rebuilding the particle simulation.
     *
     * @param {number} size
     * @param {number} minSize
     */
    setParticleRenderSize(size = this.particleSize, minSize = this.minParticleSize) {
        const nextSize = Math.max(0.1, Number(size) || this.particleSize || 1);
        const nextMinSize = Math.max(0.1, Number(minSize) || this.minParticleSize || 1);
        this.particleSize = nextSize;
        this.minParticleSize = nextMinSize;
        if (this.uPointSize) this.uPointSize.value = [nextSize, nextMinSize];
    }

    _particleShapeMode(shape = this.particleShape) {
        switch (String(shape || "").toLowerCase()) {
            case "circle":
                return 1;
            case "soft-circle":
            case "soft":
                return 2;
            default:
                return 0;
        }
    }

    setParticleShape(shape = "square") {
        const normalized = String(shape || "square").toLowerCase();
        this.particleShape = ["circle", "soft-circle", "soft"].includes(normalized)
            ? normalized === "soft" ? "soft-circle" : normalized
            : "square";
        if (this.uParticleShape) this.uParticleShape.value = this._particleShapeMode();
    }

    _createCrosshairElement(color) {
        const crosshair = document.createElement("div");
        crosshair.style.cssText = [
            "position:fixed",
            "left:0",
            "top:0",
            "width:22px",
            "height:22px",
            "transform:translate(-50%, -50%)",
            "pointer-events:none",
            "z-index:9999",
            "display:none"
        ].join(";");

        const horizontal = document.createElement("div");
        horizontal.style.cssText = [
            "position:absolute",
            "left:0",
            "top:50%",
            "width:100%",
            "height:1px",
            `background:${color}`,
            "transform:translateY(-50%)",
            "box-shadow:0 0 2px rgba(0,0,0,0.8)"
        ].join(";");

        const vertical = document.createElement("div");
        vertical.style.cssText = [
            "position:absolute",
            "left:50%",
            "top:0",
            "width:1px",
            "height:100%",
            `background:${color}`,
            "transform:translateX(-50%)",
            "box-shadow:0 0 2px rgba(0,0,0,0.8)"
        ].join(";");

        const ring = document.createElement("div");
        ring.style.cssText = [
            "position:absolute",
            "left:50%",
            "top:50%",
            "width:7px",
            "height:7px",
            `border:1px solid ${color}`,
            "border-radius:50%",
            "transform:translate(-50%, -50%)",
            "box-shadow:0 0 2px rgba(0,0,0,0.8)"
        ].join(";");

        const radiusRing = document.createElement("div");
        radiusRing.style.cssText = [
            "position:absolute",
            "left:50%",
            "top:50%",
            "width:0",
            "height:0",
            `border:1px solid ${color}`,
            "border-radius:50%",
            "transform:translate(-50%, -50%)",
            "opacity:0.85",
            "box-shadow:0 0 2px rgba(0,0,0,0.8)"
        ].join(";");

        const reachRing = document.createElement("div");
        reachRing.style.cssText = [
            "position:absolute",
            "left:50%",
            "top:50%",
            "width:0",
            "height:0",
            `border:1px dashed ${color}`,
            "border-radius:50%",
            "transform:translate(-50%, -50%)",
            "opacity:0.5",
            "box-shadow:0 0 2px rgba(0,0,0,0.8)"
        ].join(";");

        const cone = document.createElement("div");
        cone.style.cssText = [
            "position:absolute",
            "left:50%",
            "top:50%",
            "width:0",
            "height:0",
            "transform-origin:0 50%",
            "pointer-events:none",
            "display:none"
        ].join(";");

        crosshair._radiusRing = radiusRing;
        crosshair._reachRing = reachRing;
        crosshair._cone = cone;
        crosshair._color = color;
        crosshair.append(cone, reachRing, radiusRing, horizontal, vertical, ring);
        return crosshair;
    }

    _ensureDebugCrosshairLayer() {
        if (this._debugCrosshairLayer?.root?.isConnected) return this._debugCrosshairLayer;

        const root = document.createElement("div");
        root.style.cssText = "position:fixed;left:0;top:0;pointer-events:none;z-index:9999";
        const orbit = this._createCrosshairElement("#35d0ff");
        const repel = this._createCrosshairElement("#ff5a66");
        const mask = this._createCrosshairElement("#b8ff4d");
        const emitter = this._createCrosshairElement("#ffc247");
        root.append(orbit, repel, mask, emitter);
        document.body.appendChild(root);
        this._debugCrosshairLayer = { root, orbit, repel, mask, emitter };
        return this._debugCrosshairLayer;
    }

    _projectWorldPointToViewport(point) {
        if (!this.canvas || !this.particles?.projection) return null;
        const x = Number(point?.[0]);
        const y = Number(point?.[1]);
        const z = Number(point?.[2]);
        if (![x, y, z].every(Number.isFinite)) return null;

        let bounds;
        try {
            bounds = this.particles.projection.getBoundsAtDepth(z);
        } catch (_error) {
            return null;
        }

        const width = bounds.right - bounds.left;
        const height = bounds.top - bounds.bottom;
        if (!width || !height) return null;

        const rect = this.canvas.getBoundingClientRect();
        const nx = (x - bounds.left) / width;
        const ny = (bounds.top - y) / height;
        return {
            x: rect.left + nx * rect.width,
            y: rect.top + ny * rect.height,
            scaleX: rect.width / width,
            scaleY: rect.height / height,
            visible: nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1
        };
    }

    _setCrosshairRingSize(ring, radiusPx) {
        if (!ring) return;
        const size = Math.max(0, Number(radiusPx) || 0) * 2;
        ring.style.width = `${size}px`;
        ring.style.height = `${size}px`;
        ring.style.display = size > 0 ? "block" : "none";
    }

    _setCrosshairCone(element, projected, cone = null) {
        const coneElement = element?._cone;
        if (!coneElement) return;
        if (!cone) {
            coneElement.style.display = "none";
            return;
        }

        const direction = cone.direction || {};
        const dx = Number(direction.x) || 0;
        const dy = Number(direction.y) || 0;
        const length = Math.hypot(dx, dy);
        if (length <= 0.000001) {
            coneElement.style.display = "none";
            return;
        }

        const unitScale = (Math.abs(projected.scaleX) + Math.abs(projected.scaleY)) * 0.5;
        const coneLength = Math.max(0.05, Number(cone.length) || 0) * unitScale;
        const spread = Math.max(0, Math.min(Math.PI * 2, Number(cone.spread) || 0));
        const halfWidth = Math.tan(Math.min(spread * 0.5, Math.PI * 0.49)) * coneLength;
        const angleDeg = (Math.atan2(-dy, dx) * 180) / Math.PI;
        const color = element._color || "#ffffff";
        const height = Math.max(1, Math.abs(halfWidth) * 2);

        coneElement.style.display = "block";
        coneElement.style.width = `${coneLength}px`;
        coneElement.style.height = `${height}px`;
        coneElement.style.marginTop = `${height * -0.5}px`;
        coneElement.style.transform = `rotate(${angleDeg}deg)`;
        coneElement.style.background = `linear-gradient(90deg, ${color}55, ${color}10)`;
        coneElement.style.clipPath = "polygon(0 50%, 100% 0, 100% 100%)";
        coneElement.style.borderLeft = `1px solid ${color}`;
    }

    _updateCrosshairElement(element, point, reachRadius = null, cone = null) {
        const projected = this._projectWorldPointToViewport(point);
        if (!projected || !projected.visible) {
            element.style.display = "none";
            return;
        }
        const radius = Math.max(0, Number(point?.[3]) || 0);
        const reach = Math.max(radius, Number(reachRadius) || 0);
        const unitScale = (Math.abs(projected.scaleX) + Math.abs(projected.scaleY)) * 0.5;

        element.style.display = "block";
        element.style.left = `${projected.x}px`;
        element.style.top = `${projected.y}px`;
        this._setCrosshairRingSize(element._radiusRing, radius * unitScale);
        this._setCrosshairRingSize(element._reachRing, reach * unitScale);
        this._setCrosshairCone(element, projected, cone);
    }

    _updateDebugCrosshairOverlay() {
        if (this.debugCrosshairMode === "none") {
            if (this._debugCrosshairLayer) {
                this._debugCrosshairLayer.orbit.style.display = "none";
                this._debugCrosshairLayer.repel.style.display = "none";
                this._debugCrosshairLayer.mask.style.display = "none";
                this._debugCrosshairLayer.emitter.style.display = "none";
            }
            return;
        }

        const layer = this._ensureDebugCrosshairLayer();
        const showOrbit = ["orbit", "both", "all"].includes(this.debugCrosshairMode);
        const showRepel = ["repel", "both", "all"].includes(this.debugCrosshairMode);
        const showMask = ["mask", "all"].includes(this.debugCrosshairMode);
        const showEmitter = ["emitter", "all"].includes(this.debugCrosshairMode);

        const orbitRadius = Math.max(0.0001, Number(this.orbitPoint[3]) || 0.4);
        const orbitReach =
            Number.isFinite(Number(this.orbitFieldRadius)) && Number(this.orbitFieldRadius) > 0
                ? Math.max(orbitRadius, Number(this.orbitFieldRadius))
                : orbitRadius * 3;
        const repelRadius = this._scaleRepelDistance(Math.max(0.0001, Number(this.repelPoint[3]) || 0.4));
        const repelReach =
            Number.isFinite(Number(this.repelFieldRadius)) && Number(this.repelFieldRadius) > 0
                ? Math.max(repelRadius, this._scaleRepelDistance(Number(this.repelFieldRadius)))
                : repelRadius * 3;

        if (showOrbit) this._updateCrosshairElement(layer.orbit, this.orbitPoint, orbitReach);
        else layer.orbit.style.display = "none";

        if (showRepel) this._updateCrosshairElement(layer.repel, this._scaledRepelPointArray(), repelReach);
        else layer.repel.style.display = "none";

        if (showMask && this.particles?.activeMaskTransform?.anchor) {
            const transform = this.particles.activeMaskTransform;
            const anchor = transform.anchor;
            this._updateCrosshairElement(
                layer.mask,
                [anchor.x, anchor.y, anchor.z, 0],
                Number(transform.scatterRadius) || 0
            );
        } else {
            layer.mask.style.display = "none";
        }

        if (showEmitter && this.emitter) {
            const direction = this.emitter.directionVec || {
                x: Math.cos(Number(this.emitter.direction) || 0),
                y: Math.sin(Number(this.emitter.direction) || 0),
                z: 0
            };
            const point = [
                Number(this.emitter.position?.x) || 0,
                Number(this.emitter.position?.y) || 0,
                Number(this.emitter.position?.z) || -2,
                0
            ];
            this._updateCrosshairElement(layer.emitter, point, 0, {
                direction,
                spread: Number(this.emitter.spread) || 0,
                length: Math.max(0.2, Number(this.emitter.speed) || 0.2)
            });
        } else {
            layer.emitter.style.display = "none";
        }
    }

    setDebugCrosshair(mode = "none") {
        const nextMode = String(mode || "none").toLowerCase();
        this.debugCrosshairMode = ["orbit", "repel", "mask", "emitter", "both", "all"].includes(nextMode)
            ? nextMode
            : "none";
        this._updateDebugCrosshairOverlay();
    }

    _scaleRepelDistance(value) {
        return Math.max(0.0001, (Number(value) || 0) * REPEL_RADIUS_SCALE);
    }

    _scaledRepelPointArray() {
        return [
            Number(this.repelPoint[0]) || 0,
            Number(this.repelPoint[1]) || 0,
            Number(this.repelPoint[2]) || 0,
            this._scaleRepelDistance(this.repelPoint[3] || 0.4)
        ];
    }

    /**
     * Applies a previously loaded mask index to the active stage.
     *
     * @param {number} maskIndex
     * @param {object} [buildOptions={}]
     * @returns {boolean}
     */
    applyMask(maskIndex, buildOptions = {}) {
        if (!Number.isFinite(maskIndex)) return false;
        const normalizedIndex = Math.floor(maskIndex);
        if (!this.particles?.masks?.[normalizedIndex]) return false;
        const transitionEnabled = buildOptions?.transition !== false;
        const transitionDurationMs = Math.max(
            0,
            Number(buildOptions?.transitionDuration ?? buildOptions?.duration ?? 1400) || 0
        );

        if (transitionEnabled && transitionDurationMs > 0) {
            const fromPositions = this.particles.positions.slice();
            const fromColors = this.particles.colors.slice();

            this.particles.fillFromMask(normalizedIndex, buildOptions);
            const toPositions = this.particles.positions.slice();
            const toColors = this.particles.colors.slice();
            const nextCount = this.particles.count || this.maxParticles;

            this.particles.positions.set(fromPositions);
            this.particles.colors.set(fromColors);
            this.particles.count = Math.max(0, Math.min(this.maxParticles, Math.floor(nextCount)));

            this._maskTransition = {
                startTimeMs: NaN,
                durationMs: transitionDurationMs,
                spread: Math.max(0, Math.min(1, Number(buildOptions?.transitionSpread ?? buildOptions?.randomizeTransition ?? 0) || 0)),
                fromPositions,
                toPositions,
                fromColors,
                toColors,
                count: nextCount
            };
            this._syncStageFromParticles();
        } else {
            this._maskTransition = null;
            this.particles.fillFromMask(normalizedIndex, buildOptions);
            this._syncStageFromParticles();
        }
        this.maskIndex = normalizedIndex;
        return true;
    }

    /**
     * Loads a mask image and optionally applies it immediately.
     *
     * @param {string} source Image URL.
     * @param {{
     *   apply?:boolean,
     *   buildOptions?:object,
     *   contentBox?:{width?:number,height?:number},
     *   preserveColor?:boolean,
     *   particleGap?:number,
     *   position?:{x?:number,y?:number,z?:number},
     *   alphaThreshold?:number
     * }} [options={}]
     * @returns {Promise<{maskIndex:number,count:number}>}
     */
    async loadMask(source, options = {}) {
        console.log("loadMask", source, options);
        const isOptionsResolver = typeof options === "function";
        const { apply = true, buildOptions = {}, ...maskOptions } = isOptionsResolver ? {} : options;
        if (!source || !this.particles?.loadMask) {
            return { maskIndex: -1, count: this.particles?.count || 0 };
        }

        const maskIndex = await this.particles.loadMask(source, isOptionsResolver ? options : maskOptions);
        if (apply) {
            const loadedOptions = this.particles.masks?.[maskIndex]?.options || {};
            const applyOptions = { ...buildOptions };
            if (applyOptions.preserveMaskColor === undefined && maskOptions.preserveColor !== undefined) {
                applyOptions.preserveMaskColor = maskOptions.preserveColor === true;
            }
            for (const key of [
                "maskMode",
                "mode",
                "append",
                "scatter",
                "anchor",
                "maskAnchor",
                "rotation",
                "rotate",
                "maskRotation",
                "transition",
                "transitionDuration",
                "duration",
                "transitionSpread",
                "randomizeTransition"
            ]) {
                if (applyOptions[key] === undefined && maskOptions[key] !== undefined) {
                    applyOptions[key] = maskOptions[key];
                }
                if (applyOptions[key] === undefined && loadedOptions[key] !== undefined) {
                    applyOptions[key] = loadedOptions[key];
                }
            }
            this.applyMask(maskIndex, applyOptions);
        }
        return { maskIndex, count: this.particles.count || 0 };
    }

    /**
     * Clears mask influence and rebuilds random/free particle distribution.
     *
     * @param {object} [buildOptions={}]
     */
    clearMask(buildOptions = {}) {
        if (!this.particles) return;
        this._maskTransition = null;
        this.particles.mask = null;
        this.maskIndex = null;
        this.particles.build(undefined, buildOptions);
        this._syncStageFromParticles();
    }

    /**
     * Captures the current particle state snapshot.
     *
     * @param {string} [name="origin"] Snapshot key.
     * @returns {object|null}
     */
    captureSnapshot(name = "origin") {
        if (!this.particles?.snapshot) return null;
        const snapshot = this.particles.snapshot();
        this._snapshots.set(name, snapshot);
        return snapshot;
    }

    /**
     * Restores a previously captured snapshot.
     *
     * @param {string} [name="origin"] Snapshot key.
     * @returns {boolean}
     */
    restoreSnapshot(name = "origin") {
        const snapshot = this._snapshots.get(name);
        if (!snapshot || !this.particles?.restore) return false;
        this.particles.restore(snapshot);
        this._syncStageFromParticles();
        return true;
    }

    /**
     * Resets particle state back to a stored snapshot.
     *
     * @param {{snapshot?:string}} [options={}]
     * @returns {boolean}
     */
    reset(options = {}) {
        const { snapshot = "origin" } = options;
        return this.restoreSnapshot(snapshot);
    }

    /**
     * Sets the shared interaction target for orbit and repel.
     *
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} [radius=0.4]
     */
    setTarget(x, y, z, radius = 0.4) {
        const nx = Number(x) || 0;
        const ny = Number(y) || 0;
        const nz = Number(z) || 0;
        const nr = Math.max(0.0001, Number(radius) || 0.4);
        this.orbitPoint[0] = nx;
        this.orbitPoint[1] = ny;
        this.orbitPoint[2] = nz;
        this.orbitPoint[3] = nr;
        this.repelPoint[0] = nx;
        this.repelPoint[1] = ny;
        this.repelPoint[2] = nz;
        this.repelPoint[3] = nr;
    }

    /**
     * Enables/disables orbit mode and optional target update.
     *
     * @param {boolean} enabled
     * @param {{x?:number,y?:number,z?:number,radius?:number,fieldRadius?:number,escape?:number,escapePush?:number}} [options={}]
     */
    setOrbit(enabled, options = {}) {
        if (options.x !== undefined) this.orbitPoint[0] = Number(options.x) || 0;
        if (options.y !== undefined) this.orbitPoint[1] = Number(options.y) || 0;
        if (options.z !== undefined) this.orbitPoint[2] = Number(options.z) || 0;
        if (options.radius !== undefined) {
            this.orbitPoint[3] = Math.max(0.0001, Number(options.radius) || this.orbitPoint[3] || 0.4);
        }
        if (options.fieldRadius !== undefined) {
            const nextField = Number(options.fieldRadius);
            this.orbitFieldRadius = Number.isFinite(nextField) && nextField > 0 ? nextField : null;
        }
        if (options.escape !== undefined) {
            this.orbitEscape = Math.max(0, Math.min(1, Number(options.escape) || 0));
        }
        if (options.escapePush !== undefined) {
            this.orbitEscapePush = Math.max(0, Number(options.escapePush) || 0);
        }
        this.orbit.value = enabled ? 1 : 0;
        if (enabled) this.repel.value = 0;
        this._syncHomeState();
    }

    /**
     * Enables/disables repel mode and optional target update.
     *
     * @param {boolean} enabled
     * @param {{x?:number,y?:number,z?:number,radius?:number,fieldRadius?:number}} [options={}]
     */
    setRepel(enabled, options = {}) {
        if (options.x !== undefined) this.repelPoint[0] = Number(options.x) || 0;
        if (options.y !== undefined) this.repelPoint[1] = Number(options.y) || 0;
        if (options.z !== undefined) this.repelPoint[2] = Number(options.z) || 0;
        if (options.radius !== undefined) {
            this.repelPoint[3] = Math.max(0.0001, Number(options.radius) || this.repelPoint[3] || 0.4);
        }
        if (options.fieldRadius !== undefined) {
            const nextField = Number(options.fieldRadius);
            this.repelFieldRadius = Number.isFinite(nextField) && nextField > 0 ? nextField : null;
        }
        this.repel.value = enabled ? 1 : 0;
        if (enabled) this.orbit.value = 0;
        this._syncHomeState();
    }

    /**
     * Sets simulation interaction mode.
     *
     * @param {"idle"|"orbit"|"repel"} mode
     */
    setMode(mode) {
        switch (mode) {
            case "orbit":
                this.setOrbit(true);
                break;
            case "repel":
                this.setRepel(true);
                break;
            default:
                this.orbit.value = 0;
                this.repel.value = 0;
                break;
        }
    }

    /**
     * Applies motion multiplier values.
     *
     * @param {{drift?:number,driftSpeed?:number,driftType?:"relative"|"absolute",orbitSpeed?:number,repelStrength?:number,orbitPull?:number,orbitEscape?:number,orbitEscapePush?:number}} [config={}]
     */
    setMotion(config = {}) {
        if (config.drift !== undefined) this.driftScale = Math.min(1, Math.max(0, Number(config.drift) || 0));
        if (config.driftSpeed !== undefined) this.driftSpeedScale = Math.max(0, Number(config.driftSpeed) || 0);
        if (config.driftType !== undefined) {
            const nextType = String(config.driftType || "")
                .trim()
                .toLowerCase();
            this.driftType = nextType === "absolute" ? "absolute" : "relative";
        }
        if (config.orbitSpeed !== undefined) this.orbitSpeedScale = Math.max(0, Number(config.orbitSpeed) || 0);
        if (config.repelStrength !== undefined)
            this.repelStrengthScale = Math.max(0, Number(config.repelStrength) || 0);
        if (config.orbitPull !== undefined) this.orbitPullScale = Math.max(0, Number(config.orbitPull) || 0);
        if (config.orbitEscape !== undefined) {
            this.orbitEscape = Math.max(0, Math.min(1, Number(config.orbitEscape) || 0));
        }
        if (config.orbitEscapePush !== undefined) {
            this.orbitEscapePush = Math.max(0, Number(config.orbitEscapePush) || 0);
        }
    }

    /**
     * Sets fake camera pan in world units. The next frame applies only the delta.
     *
     * @param {number} x
     * @param {number} y
     */
    setCameraPan(x = 0, y = 0) {
        this.cameraPan.x = Number(x) || 0;
        this.cameraPan.y = Number(y) || 0;
    }

    /**
     * Adds fake camera pan movement in world units.
     *
     * @param {number} x
     * @param {number} y
     */
    moveCameraPan(x = 0, y = 0) {
        this.cameraPan.x += Number(x) || 0;
        this.cameraPan.y += Number(y) || 0;
    }

    /**
     * Sets fake camera yaw/pitch. Values are absolute angle-like inputs, not frame deltas.
     *
     * @param {number} yaw
     * @param {number} pitch
     */
    setCameraAngle(yaw = 0, pitch = 0) {
        this.cameraAngle.yaw = Number(yaw) || 0;
        this.cameraAngle.pitch = Number(pitch) || 0;
    }

    /**
     * Adds fake camera yaw/pitch movement.
     *
     * @param {number} yaw
     * @param {number} pitch
     */
    moveCameraAngle(yaw = 0, pitch = 0) {
        this.cameraAngle.yaw += Number(yaw) || 0;
        this.cameraAngle.pitch += Number(pitch) || 0;
    }

    /**
     * Configures fake camera movement strength.
     *
     * @param {{panScale?:number,angleScale?:number,depthEffect?:number}} [config={}]
     */
    setCameraMotion(config = {}) {
        if (config.panScale !== undefined) this.cameraPanScale = Math.max(0, Number(config.panScale) || 0);
        if (config.angleScale !== undefined) this.cameraAngleScale = Math.max(0, Number(config.angleScale) || 0);
        if (config.depthEffect !== undefined) this.cameraDepthEffect = Math.max(0, Number(config.depthEffect) || 0);
        if (config.maxStep !== undefined) this.cameraMaxStep = Math.max(0.0001, Number(config.maxStep) || 0.04);
    }

    /**
     * Sets fake camera depth parallax strength.
     *
     * @param {number} value
     */
    setCameraDepthEffect(value = 1) {
        this.cameraDepthEffect = Math.max(0, Number(value) || 0);
    }

    /**
     * Pushes particles away from a center point for an explosive scatter effect.
     *
     * @param {{
     *   x?:number,
     *   y?:number,
     *   z?:number,
     *   minPush?:number,
     *   maxPush?:number,
     *   jitter?:number,
     *   seed?:number,
     *   captureAs?:string|null
     * }} [options={}]
     */
    scatter(options = {}) {
        const centerX = Number(options.x ?? this.orbitPoint[0]) || 0;
        const centerY = Number(options.y ?? this.orbitPoint[1]) || 0;
        const centerZ = Number(options.z ?? this.orbitPoint[2]) || 0;
        const minPush = Math.max(0, Number(options.minPush) || 0.1);
        const maxPush = Math.max(minPush, Number(options.maxPush) || 0.6);
        const jitterAmount = Math.max(0, Number(options.jitter) || 0.05);
        const { captureAs = null } = options;
        const rng = Number.isFinite(options.seed) ? createSeededRandom(options.seed) : Math.random;

        const count = Math.max(0, Math.min(this.particles.maxCount, this.particles.count || 0));
        const positions = this.particles.positions;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            let dx = positions[i3] - centerX;
            let dy = positions[i3 + 1] - centerY;
            let dz = positions[i3 + 2] - centerZ;
            let len = Math.hypot(dx, dy, dz);

            if (len < 0.0001) {
                dx = rng() * 2 - 1;
                dy = rng() * 2 - 1;
                dz = rng() * 2 - 1;
                len = Math.hypot(dx, dy, dz) || 1;
            }

            const inv = 1 / len;
            const push = minPush + rng() * (maxPush - minPush);
            positions[i3] += dx * inv * push + (rng() * 2 - 1) * jitterAmount;
            positions[i3 + 1] += dy * inv * push + (rng() * 2 - 1) * jitterAmount;
            positions[i3 + 2] += dz * inv * push + (rng() * 2 - 1) * jitterAmount;
        }

        this._syncStageFromParticles();
        if (captureAs) this.captureSnapshot(captureAs);
    }

    /**
     * Adds random jitter offset to active particles.
     *
     * @param {number} [amount=0.05]
     * @param {{seed?:number,captureAs?:string|null}} [options={}]
     */
    jitter(amount = 0.05, options = {}) {
        const { seed, captureAs = null } = options;
        const rng = Number.isFinite(seed) ? createSeededRandom(seed) : Math.random;
        const jitterAmount = Math.max(0, Number(amount) || 0);
        const count = Math.max(0, Math.min(this.particles.maxCount, this.particles.count || 0));
        const positions = this.particles.positions;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            positions[i3] += (rng() * 2 - 1) * jitterAmount;
            positions[i3 + 1] += (rng() * 2 - 1) * jitterAmount;
            positions[i3 + 2] += (rng() * 2 - 1) * jitterAmount;
        }

        this._syncStageFromParticles();
        if (captureAs) this.captureSnapshot(captureAs);
    }

    /**
     * Returns active world-space bounds for particles.
     *
     * @returns {{min:{x:number,y:number,z:number},max:{x:number,y:number,z:number}}|null}
     */
    getBounds() {
        return this.particles.getBounds();
    }

    /**
     * Generic runtime setter used by playground controls.
     * Supports vector index notation like `orbitPoint[0]`.
     *
     * @param {string} name Property name.
     * @param {*} value New value.
     */
    setValue(name, value) {
        let index;
        if (name.includes("[")) {
            [name, index] = name.split(/[\[\]]/);
            if (!isNaN(index)) index = parseInt(index, 10);
        }

        if (!isNaN(value)) value = Number(value);
        if (this[name] === undefined || this[name] === value) return;

        if (this[name] instanceof AnimationValue) {
            this[name].value = value;
            return;
        }

        if (this[name] instanceof Vector4D) {
            if (index === undefined) return;
            this[name][index.toString()] = value;
            return;
        }

        if (index === undefined) {
            this[name] = value;
        } else if (this[name] && typeof this[name] === "object") {
            this[name][index.toString()] = value;
        }
    }

    /**
     * Starts RAF-driven simulation/rendering.
     */
    start() {
        if (this.running) return;
        this.running = true;
        this.time = { current: 0, last: 0, delta: 0 };
        this._boundUpdate ||= this.update.bind(this);
        this.rafId = requestAnimationFrame(this._boundUpdate);
    }

    /**
     * Stops RAF-driven simulation/rendering.
     */
    stop() {
        this.running = false;
        if (!this.rafId) return;
        cancelAnimationFrame(this.rafId);
        this.rafId = 0;
    }

    /**
     * Executes one simulation + render frame.
     *
     * @param {number} time RAF timestamp in milliseconds.
     */
    update(time) {
        const { gl } = this;
        if (!this.running || !this.feedback) return;

        this.time.current = time / 1000;
        if (!this.time.last) {
            this.time.last = this.time.current;
        }
        this.time.delta = Math.min(0.05, Math.max(0, this.time.current - this.time.last));
        this.time.last = this.time.current;

        const maskTransitionActive = this._applyMaskTransition(time);

        if (!maskTransitionActive) {
            if (this.emitter) {
                try {
                    this.emitter.update(this.time.delta);
                    this._syncStageFromParticles();
                } catch (err) {
                    console.error("[WebGLParticleSystem] Emitter update failed:", err);
                }
            }
            gl.useProgram(this.feedback.program);
            this.uScene.value = [
                Number(this.canvas.width),
                Number(this.canvas.height),
                Number(this.time.current),
                Number(this.time.delta)
            ];
            this.uMotion.value = [
                Number(this.driftScale) || 0,
                Number(this.orbitSpeedScale) || 0,
                Number(this.repelStrengthScale) || 0,
                Number(this.orbitPullScale) || 0
            ];
            if (this.uDriftSpeed) this.uDriftSpeed.value = Number(this.driftSpeedScale) || 0;
            if (this.uDriftMode) this.uDriftMode.value = this.driftType === "absolute" ? 1 : 0;
            const limitCameraStep = (value) => {
                const next = Number(value) || 0;
                const maxStep = Math.max(0.0001, Number(this.cameraMaxStep) || 0.04);
                return Math.max(-maxStep, Math.min(maxStep, next));
            };
            const rawCameraDeltaX = (Number(this.cameraPan.x) || 0) - (Number(this._previousCameraPan.x) || 0);
            const rawCameraDeltaY = (Number(this.cameraPan.y) || 0) - (Number(this._previousCameraPan.y) || 0);
            const rawCameraDeltaYaw =
                (Number(this.cameraAngle.yaw) || 0) - (Number(this._previousCameraAngle.yaw) || 0);
            const rawCameraDeltaPitch =
                (Number(this.cameraAngle.pitch) || 0) - (Number(this._previousCameraAngle.pitch) || 0);
            const cameraDeltaX = limitCameraStep(rawCameraDeltaX);
            const cameraDeltaY = limitCameraStep(rawCameraDeltaY);
            const cameraDeltaYaw = limitCameraStep(rawCameraDeltaYaw);
            const cameraDeltaPitch = limitCameraStep(rawCameraDeltaPitch);
            if (this.uCameraDelta) {
                this.uCameraDelta.value = [cameraDeltaX, cameraDeltaY, cameraDeltaYaw, cameraDeltaPitch];
            }
            if (this.uCameraConfig) {
                this.uCameraConfig.value = [
                    Number(this.cameraPanScale) || 0,
                    Number(this.cameraAngleScale) || 0,
                    Number(this.cameraDepthEffect) || 0,
                    0
                ];
            }
            this._previousCameraPan.x += cameraDeltaX;
            this._previousCameraPan.y += cameraDeltaY;
            this._previousCameraAngle.yaw += cameraDeltaYaw;
            this._previousCameraAngle.pitch += cameraDeltaPitch;
            const orbitRadius = Math.max(0.0001, Number(this.orbitPoint[3]) || 0.4);
            const repelRadius = this._scaleRepelDistance(Math.max(0.0001, Number(this.repelPoint[3]) || 0.4));
            const orbitFieldRadius =
                Number.isFinite(Number(this.orbitFieldRadius)) && Number(this.orbitFieldRadius) > 0
                    ? Math.max(orbitRadius, Number(this.orbitFieldRadius))
                    : orbitRadius * 3;
            const repelFieldRadius =
                Number.isFinite(Number(this.repelFieldRadius)) && Number(this.repelFieldRadius) > 0
                    ? Math.max(repelRadius, this._scaleRepelDistance(Number(this.repelFieldRadius)))
                    : repelRadius * 3;
            if (this.uOrbitFieldRadius) this.uOrbitFieldRadius.value = orbitFieldRadius;
            if (this.uOrbitEscape) {
                this.uOrbitEscape.value = [
                    Math.max(0, Math.min(1, Number(this.orbitEscape) || 0)),
                    Math.max(0, Number(this.orbitEscapePush) || 0)
                ];
            }
            if (this.uRepelFieldRadius) this.uRepelFieldRadius.value = repelFieldRadius;

            if (this.uRepel && this.repel.dirty && (this.uRepel.value = this.repel.value) !== false) {
                this.repel.save();
            }
            if (this.repel.value === 1) {
                this.uTargetPoint.value = this._scaledRepelPointArray();
            }

            if (this.uOrbit && this.orbit.dirty && (this.uOrbit.value = this.orbit.value) !== false) {
                this.orbit.save();
            }
            if (this.orbit.value === 1) {
                this.uTargetPoint.value = this.orbitPoint.toArray();
            }

            this.feedback.update(this.time.delta);
            gl.flush();
        }

        gl.useProgram(this.program);
        if (this.uRenderCamera) {
            this.uRenderCamera.value = [
                Number(this.cameraAngle.yaw) || 0,
                Number(this.cameraAngle.pitch) || 0,
                Number(this.cameraAngleScale) || 0,
                Number(this.cameraDepthEffect) || 0
            ];
        }
        if (this.uRenderWrap) {
            const gravityActive = Math.hypot(
                Number(this.gravity?.[0]) || 0,
                Number(this.gravity?.[1]) || 0,
                Number(this.gravity?.[2]) || 0
            ) > 0.000001;
            this.uRenderWrap.value = !gravityActive && this.repel.value !== 1 && this.orbit.value !== 1 ? 1 : 0;
        }
        if (this.uPointSize) {
            this.uPointSize.value = [Number(this.particleSize) || 1, Number(this.minParticleSize) || 1];
        }
        if (this.uParticleShape) {
            this.uParticleShape.value = this._particleShapeMode();
        }
        this._updateDebugCrosshairOverlay();
        gl.clearColor(0, 0, 0, 0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(true);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Bind latest TF read buffers as render attributes.
        this.feedback.applyDownStreamData();
        gl.useProgram(this.program);
        gl.drawArrays(gl.POINTS, 0, this.particles.count);

        this.rafId = requestAnimationFrame(this._boundUpdate);
    }

    /**
     * Attach a CPU emitter adapter to this particle system.
     * @param {object} config Emitter configuration (x,y,z,paticlesPerSecond,direction,speed,spread,size,lifespan)
     * @returns {EmitterAdapter}
     */
    addEmitter(config = {}) {
        if (!this.particles) return null;
        if (this.emitter) {
            this.emitter.configure(config);
            return this.emitter;
        }
        this.emitter = new EmitterAdapter(this.particles, config);
        return this.emitter;
    }

    /**
     * Remove and disable the current emitter.
     */
    removeEmitter() {
        this.emitter = null;
    }
}

export default WebGLParticleSystem;
