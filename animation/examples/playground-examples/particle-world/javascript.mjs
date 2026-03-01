import "../../../components/particle-world.mjs";

function resolveElement(id, preferredContainers = []) {
    for (let i = 0; i < preferredContainers.length; i += 1) {
        const container = document.getElementById(preferredContainers[i]);
        if (!container) continue;
        const scoped = container.querySelector(`#${id}`);
        if (scoped) return scoped;
    }
    const all = document.querySelectorAll(`#${id}`);
    return all.length ? all[all.length - 1] : null;
}

const world = document.getElementById("world");
const orbitButton = document.getElementById("toggle-orbit");
const repelButton = document.getElementById("toggle-repel");
const randomTargetButton = document.getElementById("random-target");
const configInput = document.getElementById("world-config");
const applyConfigButton = document.getElementById("apply-config");
let maskInput,
    maskFileInput,
    browseMaskButton,
    maskFileName,
    maskWidthInput,
    maskHeightInput,
    maskAlignInput,
    maskAlignXInput,
    maskAlignYInput,
    maskColorModeInput,
    maskParticlesInput,
    maskDriftInput,
    maskOrbitSpeedInput,
    maskOrbitPullInput,
    maskRepelStrengthInput,
    applyMaskButton,
    clearMaskButton;
let emitterToggleButton,
    emitterPpsInput,
    emitterDirectionInput,
    emitterSpreadInput,
    emitterSpeedInput,
    emitterSizeInput,
    emitterLifeInput,
    emitterMaskIndexInput,
    emitterGravXInput,
    emitterGravYInput,
    emitterGravZInput,
    emitterFrictionInput;
let emitterThetaInput,
    emitterPhiInput,
    emitterPosXInput,
    emitterPosYInput,
    emitterPosZInput,
    emitterBurstInput,
    emitterBurstButton,
    emitterMaskSelect,
    emitterRandomizeInput;

let _activeEmitter = null;

function createMaskPanelMarkup() {
    return `
<div class="controls-mask">
    <div class="controls-mask-row">
        <label for="mask-src">Mask URL</label>
        <input id="mask-src" type="text" placeholder="https://... or data:" />
    </div>
    <div class="controls-mask-row">
        <label>File</label>
        <div class="file-picker">
            <button class="file-picker-trigger" id="browse-mask" type="button">Browse</button>
            <input id="mask-file" type="file" accept="image/*" />
            <div id="mask-file-name">No file selected</div>
        </div>
    </div>
    <div class="controls-mask-row">
        <label for="mask-width">Width</label>
        <input id="mask-width" type="number" min="1" />
    </div>
    <div class="controls-mask-row">
        <label for="mask-height">Height</label>
        <input id="mask-height" type="number" min="1" />
    </div>
    <div class="controls-mask-row">
        <label for="mask-align">Align</label>
        <select id="mask-align">
            <option value="center">Center</option>
            <option value="top-left">Top Left</option>
            <option value="top-center">Top Center</option>
            <option value="top-right">Top Right</option>
            <option value="center-left">Center Left</option>
            <option value="center-right">Center Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="bottom-center">Bottom Center</option>
            <option value="bottom-right">Bottom Right</option>
            <option value="custom">Custom</option>
        </select>
    </div>
    <div class="controls-mask-row inline-fields">
        <label for="mask-align-x">Align X</label>
        <input id="mask-align-x" type="number" step="0.01" />
        <label for="mask-align-y">Align Y</label>
        <input id="mask-align-y" type="number" step="0.01" />
    </div>
    <div class="controls-mask-row inline-fields-4">
        <label for="mask-color-mode">Color</label>
        <select id="mask-color-mode">
            <option value="default">Default</option>
            <option value="preserve">Preserve Color</option>
        </select>
        <label for="mask-particles">Particles</label>
        <input id="mask-particles" type="number" min="0" />
        <label for="mask-drift">Drift</label>
        <input id="mask-drift" type="number" step="0.1" />
        <label for="mask-orbit-speed">Orbit Speed</label>
        <input id="mask-orbit-speed" type="number" step="0.1" />
    </div>
    <div class="controls-mask-row inline-fields-4">
        <label for="mask-orbit-pull">Orbit Pull</label>
        <input id="mask-orbit-pull" type="number" step="0.1" />
        <label for="mask-repel-strength">Repel Strength</label>
        <input id="mask-repel-strength" type="number" step="0.1" />
        <div></div>
        <div class="controls-mask-actions">
            <button id="apply-mask" type="button">Apply Mask</button>
            <button id="clear-mask" type="button">Clear Mask</button>
        </div>
    </div>
</div>
`;
}

function setupMaskPanel() {
    // Try to find the playground-provided mask panel container and populate it.
    const panel =
        document.getElementById("mask-controls") || document.querySelector(".controls-mask[data-mask-placeholder]");
    if (!panel) return false;
    // If `panel` is the placeholder `.controls-mask`, replace it with full markup; otherwise set innerHTML of the wrapper.
    if (panel.classList && panel.classList.contains("controls-mask") && panel.hasAttribute("data-mask-placeholder")) {
        panel.outerHTML = createMaskPanelMarkup();
    } else if (panel.id === "mask-controls") {
        panel.innerHTML = createMaskPanelMarkup();
    }

    // Resolve elements now that markup is present.
    maskInput = resolveElement("mask-src", ["mask-controls", "controls"]);
    maskFileInput = resolveElement("mask-file", ["mask-controls", "controls"]);
    browseMaskButton = resolveElement("browse-mask", ["mask-controls", "controls"]);
    maskFileName = resolveElement("mask-file-name", ["mask-controls", "controls"]);
    maskWidthInput = resolveElement("mask-width", ["mask-controls", "controls"]);
    maskHeightInput = resolveElement("mask-height", ["mask-controls", "controls"]);
    maskAlignInput = resolveElement("mask-align", ["mask-controls", "controls"]);
    maskAlignXInput = resolveElement("mask-align-x", ["mask-controls", "controls"]);
    maskAlignYInput = resolveElement("mask-align-y", ["mask-controls", "controls"]);
    maskColorModeInput = resolveElement("mask-color-mode", ["mask-controls", "controls"]);
    maskParticlesInput = resolveElement("mask-particles", ["mask-controls", "controls"]);
    maskDriftInput = resolveElement("mask-drift", ["mask-controls", "controls"]);
    maskOrbitSpeedInput = resolveElement("mask-orbit-speed", ["mask-controls", "controls"]);
    maskOrbitPullInput = resolveElement("mask-orbit-pull", ["mask-controls", "controls"]);
    maskRepelStrengthInput = resolveElement("mask-repel-strength", ["mask-controls", "controls"]);
    applyMaskButton = resolveElement("apply-mask", ["mask-controls", "controls"]);
    clearMaskButton = resolveElement("clear-mask", ["mask-controls", "controls"]);

    // Bind listeners for the mask controls.
    if (applyMaskButton) {
        applyMaskButton.addEventListener("click", () => {
            const source = String(maskInput?.value || "").trim() || activeMaskSource;
            applyMaskSource(source);
        });
    }

    if (maskInput) {
        maskInput.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            const source = String(maskInput.value || "").trim() || activeMaskSource;
            applyMaskSource(source);
        });
    }

    if (maskAlignInput) {
        maskAlignInput.addEventListener("change", () => {
            syncMaskAlignmentInputs();
        });
    }

    if (maskFileInput) {
        maskFileInput.addEventListener("change", () => {
            const file = maskFileInput.files?.[0];
            if (maskFileName) {
                const fallbackName =
                    typeof maskFileInput.value === "string" && maskFileInput.value.length > 0
                        ? maskFileInput.value.split("\\").pop()
                        : "";
                maskFileName.textContent = file?.name || fallbackName || "No file selected";
            }
            applyMaskFile(file);
        });
    }

    if (browseMaskButton && maskFileInput) {
        browseMaskButton.addEventListener("click", (event) => {
            event.preventDefault();
            openMaskFilePicker();
        });
        browseMaskButton.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            openMaskFilePicker();
        });
    }

    if (clearMaskButton) {
        clearMaskButton.addEventListener("click", () => {
            clearMask();
        });
    }

    syncMaskAlignmentInputs();
    return true;
}
const tx = document.getElementById("tx");
const ty = document.getElementById("ty");
const tz = document.getElementById("tz");
const tr = document.getElementById("tr");

if (!world) {
    console.warn("[playground:particle-world] Missing required DOM nodes for particle world runtime.");
} else {
    let orbitOn = false;
    let repelOn = false;
    let target = { x: 0, y: 0, z: -4, r: 0.4 };
    let orbitRadius = target.r;
    let repelRadius = target.r;
    let orbitFieldRadius = null;
    let repelFieldRadius = null;
    let activeMaskSource = "";
    const maskDimensionsCache = new Map();

    function viewer() {
        return world.particleViewer || null;
    }

    function syncInteractionForces() {
        if (typeof world.setOrbit === "function" && typeof world.setRepel === "function") {
            world.setOrbit(orbitOn, {
                x: target.x,
                y: target.y,
                z: target.z,
                radius: orbitRadius,
                fieldRadius: orbitFieldRadius
            });
            world.setRepel(repelOn, {
                x: target.x,
                y: target.y,
                z: target.z,
                radius: repelRadius,
                fieldRadius: repelFieldRadius
            });
            return;
        }

        const particleViewer = viewer();
        if (!particleViewer) return;
        particleViewer.setValue("orbitPoint[0]", target.x);
        particleViewer.setValue("orbitPoint[1]", target.y);
        particleViewer.setValue("orbitPoint[2]", target.z);
        particleViewer.setValue("orbitPoint[3]", orbitRadius);
        particleViewer.setValue("repelPoint[0]", target.x);
        particleViewer.setValue("repelPoint[1]", target.y);
        particleViewer.setValue("repelPoint[2]", target.z);
        particleViewer.setValue("repelPoint[3]", repelRadius);
        particleViewer.setValue("orbit", orbitOn ? 1 : 0);
        particleViewer.setValue("repel", repelOn ? 1 : 0);
        if (orbitFieldRadius !== null) particleViewer.setValue("orbitFieldRadius", orbitFieldRadius);
        if (repelFieldRadius !== null) particleViewer.setValue("repelFieldRadius", repelFieldRadius);
    }

    function setTarget(x, y, z, radius) {
        target = { x, y, z, r: radius };
        const nextRadius = parseNumber(radius);
        if (nextRadius !== null && nextRadius > 0) {
            orbitRadius = nextRadius;
            repelRadius = nextRadius;
        }

        if (tx) tx.textContent = x.toFixed(2);
        if (ty) ty.textContent = y.toFixed(2);
        if (tz) tz.textContent = z.toFixed(2);
        if (tr) {
            const readoutRadius = orbitOn ? orbitRadius : repelOn ? repelRadius : orbitRadius;
            tr.textContent = Number(readoutRadius || 0).toFixed(2);
        }
        syncInteractionForces();
    }

    function applyMode() {
        if (orbitButton) orbitButton.textContent = orbitOn ? "Orbit: on" : "Orbit: off";
        if (repelButton) repelButton.textContent = repelOn ? "Repel: on" : "Repel: off";
        syncInteractionForces();
    }

    function parseNumber(value) {
        if (value === null || value === undefined) return null;
        const text = String(value).trim();
        if (!text.length) return null;
        const n = Number(text);
        return Number.isFinite(n) ? n : null;
    }

    function normalizeScale(value) {
        const n = Number(value);
        if (!Number.isFinite(n)) return 1;
        return Math.abs(n) > 2 ? n / 100 : n;
    }

    function sanitizeSize(value) {
        return value !== null && value > 0 ? value : null;
    }

    function parsePositiveInt(value) {
        const parsed = parseNumber(value);
        if (parsed === null) return null;
        const next = Math.floor(parsed);
        return next > 0 ? next : null;
    }

    function parsePositiveNumber(value) {
        const parsed = parseNumber(value);
        return parsed !== null && parsed > 0 ? parsed : null;
    }

    function alignmentOffset(align, scaleX, scaleY) {
        const left = -1 + scaleX;
        const right = 1 - scaleX;
        const top = 1 - scaleY;
        const bottom = -1 + scaleY;

        switch (align) {
            case "top-left":
                return { x: left, y: top };
            case "top-center":
                return { x: 0, y: top };
            case "top-right":
                return { x: right, y: top };
            case "center-left":
                return { x: left, y: 0 };
            case "center-right":
                return { x: right, y: 0 };
            case "bottom-left":
                return { x: left, y: bottom };
            case "bottom-center":
                return { x: 0, y: bottom };
            case "bottom-right":
                return { x: right, y: bottom };
            default:
                return { x: 0, y: 0 };
        }
    }

    async function getMaskDimensions(source) {
        const src = String(source || "").trim();
        if (!src) return null;
        if (maskDimensionsCache.has(src)) return maskDimensionsCache.get(src);

        const promise = new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                const width = Number(image.naturalWidth || image.width || 0);
                const height = Number(image.naturalHeight || image.height || 0);
                if (width > 0 && height > 0) {
                    resolve({ width, height });
                } else {
                    reject(new Error("Mask image has invalid dimensions."));
                }
            };
            image.onerror = () => reject(new Error("Failed to load mask image for sizing."));
            image.src = src;
        });

        maskDimensionsCache.set(src, promise);
        return promise;
    }

    function syncMaskAlignmentInputs() {
        const isCustom = (maskAlignInput?.value || "center") === "custom";
        if (maskAlignXInput) maskAlignXInput.disabled = !isCustom;
        if (maskAlignYInput) maskAlignYInput.disabled = !isCustom;
    }

    async function buildMaskOptions(source) {
        const options = {};
        let widthValue = sanitizeSize(parseNumber(maskWidthInput?.value));
        let heightValue = sanitizeSize(parseNumber(maskHeightInput?.value));

        if (widthValue !== null || heightValue !== null) {
            try {
                const dimensions = await getMaskDimensions(source);
                if (dimensions && dimensions.width > 0 && dimensions.height > 0) {
                    if (widthValue !== null && heightValue === null) {
                        heightValue = (widthValue * dimensions.height) / dimensions.width;
                    } else if (heightValue !== null && widthValue === null) {
                        widthValue = (heightValue * dimensions.width) / dimensions.height;
                    }
                }
            } catch (_error) {
                // If we cannot read image dimensions, keep provided values as-is.
            }

            if (widthValue === null && heightValue !== null) widthValue = heightValue;
            if (heightValue === null && widthValue !== null) heightValue = widthValue;
            widthValue = sanitizeSize(widthValue);
            heightValue = sanitizeSize(heightValue);

            if (widthValue !== null || heightValue !== null) {
                options.contentBox = {};
                if (widthValue !== null) options.contentBox.width = widthValue;
                if (heightValue !== null) options.contentBox.height = heightValue;
            }
        }

        const scaleX = normalizeScale(options.contentBox?.width ?? 1);
        const scaleY = normalizeScale(options.contentBox?.height ?? 1);
        const align = String(maskAlignInput?.value || "center").toLowerCase();

        if (align === "custom") {
            const customX = parseNumber(maskAlignXInput?.value);
            const customY = parseNumber(maskAlignYInput?.value);
            if (customX !== null || customY !== null) {
                options.position = {};
                if (customX !== null) options.position.x = customX;
                if (customY !== null) options.position.y = customY;
            }
        } else {
            const offset = alignmentOffset(align, scaleX, scaleY);
            options.position = { x: offset.x, y: offset.y };
        }

        options.preserveColor = (maskColorModeInput?.value || "default") === "preserve";
        return options;
    }

    function buildMaskEnvironmentOptions() {
        const env = {
            particles: parsePositiveInt(maskParticlesInput?.value),
            drift: parseNumber(maskDriftInput?.value),
            orbitSpeed: parseNumber(maskOrbitSpeedInput?.value),
            orbitPull: parseNumber(maskOrbitPullInput?.value),
            repelStrength: parseNumber(maskRepelStrengthInput?.value)
        };
        return env;
    }

    function applyMaskEnvironmentOptions() {
        const env = buildMaskEnvironmentOptions();

        if (env.particles !== null && typeof world.setParticleCount === "function") {
            world.setParticleCount(env.particles);
        }

        const motion = {};
        if (env.drift !== null) motion.drift = env.drift;
        if (env.orbitSpeed !== null) motion.orbitSpeed = env.orbitSpeed;
        if (env.orbitPull !== null) motion.orbitPull = env.orbitPull;
        if (env.repelStrength !== null) motion.repelStrength = env.repelStrength;

        if (Object.keys(motion).length > 0) {
            if (typeof world.applyMotionConfig === "function") {
                world.applyMotionConfig(motion);
            } else {
                const particleViewer = viewer();
                if (particleViewer) {
                    if (motion.drift !== undefined) particleViewer.setValue("driftScale", Number(motion.drift));
                    if (motion.orbitSpeed !== undefined)
                        particleViewer.setValue("orbitSpeedScale", Number(motion.orbitSpeed));
                    if (motion.orbitPull !== undefined)
                        particleViewer.setValue("orbitPullScale", Number(motion.orbitPull));
                    if (motion.repelStrength !== undefined)
                        particleViewer.setValue("repelStrengthScale", Number(motion.repelStrength));
                }
            }
        }
    }

    async function applyMaskSource(source, options = {}) {
        const { maskOptions = null, syncSourceInput = true } = options;
        const src = String(source || "").trim();
        if (!src || typeof world.setMask !== "function") return;
        try {
            applyMaskEnvironmentOptions();
            const resolvedOptions =
                maskOptions && typeof maskOptions === "object" ? maskOptions : await buildMaskOptions(src);
            await world.setMask(src, resolvedOptions);
            activeMaskSource = src;
            if (syncSourceInput && maskInput) maskInput.value = src;
        } catch (error) {
            console.error("[playground:particle-world] Failed to load mask:", error);
        }
    }

    function clearMask() {
        if (typeof world.clearMask === "function") {
            world.clearMask();
            activeMaskSource = "";
            return;
        }
        const particleViewer = viewer();
        if (particleViewer?.clearMask) particleViewer.clearMask();
        activeMaskSource = "";
    }

    function applyMaskFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = typeof reader.result === "string" ? reader.result : "";
            if (!dataUrl) return;
            activeMaskSource = dataUrl;
            applyMaskSource(dataUrl, { syncSourceInput: false });
        };
        reader.readAsDataURL(file);
    }

    function openMaskFilePicker() {
        if (!maskFileInput) return;
        // Reset so selecting the same file again still dispatches "change".
        maskFileInput.value = "";
        try {
            if (typeof maskFileInput.showPicker === "function") {
                maskFileInput.showPicker();
                return;
            }
        } catch (_error) {
            // Fall through to click() fallback.
        }
        maskFileInput.click();
    }

    function applyConfigFromInput() {
        if (!configInput) return;
        let parsed;
        try {
            parsed = JSON.parse(configInput.value);
        } catch (_error) {
            console.warn("[playground:particle-world] Config must be valid JSON.");
            return;
        }

        if (!parsed || typeof parsed !== "object") return;

        const particleCount = Number(parsed.particles);
        if (Number.isFinite(particleCount) && particleCount > 0 && typeof world.setParticleCount === "function") {
            world.setParticleCount(particleCount);
        }

        const hasOwn = (key) => Object.prototype.hasOwnProperty.call(parsed, key);
        const radius = parsePositiveNumber(parsed.radius) ?? target.r;
        const z = Number.isFinite(Number(parsed.z)) ? Number(parsed.z) : target.z;
        setTarget(target.x, target.y, z, radius);
        const nextOrbitRadius = parsePositiveNumber(parsed.orbitRadius);
        const nextRepelRadius = parsePositiveNumber(parsed.repelRadius);
        if (nextOrbitRadius !== null) orbitRadius = nextOrbitRadius;
        if (nextRepelRadius !== null) repelRadius = nextRepelRadius;

        if (hasOwn("orbitFieldRadius") || hasOwn("orbitField")) {
            orbitFieldRadius = parsePositiveNumber(parsed.orbitFieldRadius ?? parsed.orbitField);
        }
        if (hasOwn("repelFieldRadius") || hasOwn("repelField")) {
            repelFieldRadius = parsePositiveNumber(parsed.repelFieldRadius ?? parsed.repelField);
        }

        if (typeof world.applyMotionConfig === "function") {
            world.applyMotionConfig({
                drift: parsed.drift,
                orbitSpeed: parsed.orbitSpeed,
                orbitPull: parsed.orbitPull,
                repelStrength: parsed.repelStrength
            });
        } else {
            const particleViewer = viewer();
            if (particleViewer) {
                if (parsed.drift !== undefined) particleViewer.setValue("driftScale", Number(parsed.drift));
                if (parsed.orbitSpeed !== undefined)
                    particleViewer.setValue("orbitSpeedScale", Number(parsed.orbitSpeed));
                if (parsed.orbitPull !== undefined) particleViewer.setValue("orbitPullScale", Number(parsed.orbitPull));
                if (parsed.repelStrength !== undefined)
                    particleViewer.setValue("repelStrengthScale", Number(parsed.repelStrength));
            }
        }

        if (typeof parsed.mask === "string" && parsed.mask.trim()) {
            applyMaskSource(parsed.mask.trim());
        } else if (parsed.mask && typeof parsed.mask === "object") {
            const source = typeof parsed.mask.src === "string" ? parsed.mask.src.trim() : "";
            if (source && typeof world.setMask === "function") {
                const maskOptions =
                    parsed.mask.options && typeof parsed.mask.options === "object" ? parsed.mask.options : parsed.mask;
                applyMaskSource(source, { maskOptions });
                if (maskInput) maskInput.value = source;
            }
        }

        applyMode();
    }

    function randomTarget() {
        const x = Math.random() * 1.6 - 0.8;
        const y = Math.random() * 1.6 - 0.8;
        const z = -3.6 - Math.random() * 4.2;
        const radius = 0.2 + Math.random() * 0.9;
        setTarget(x, y, z, radius);
    }

    function targetFromPointer(event) {
        if (!orbitOn && !repelOn) return;
        const canvas = world.shadowRoot?.getElementById("renderer");
        const rect = canvas ? canvas.getBoundingClientRect() : world.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = 1 - ((event.clientY - rect.top) / rect.height) * 2;
        if (nx < -1 || nx > 1 || ny < -1 || ny > 1) return;

        const x = Math.max(-1, Math.min(1, nx));
        const y = Math.max(-1, Math.min(1, ny));
        setTarget(x, y, target.z, target.r);
    }

    function init() {
        const particleViewer = viewer();
        if (!particleViewer) return;
        const internalControls = world.shadowRoot?.getElementById("controls");
        if (internalControls) internalControls.style.display = "none";
        applyMode();
        setTarget(target.x, target.y, target.z, target.r);
        if (configInput) applyConfigFromInput();
        // Populate mask drawer panel (if playground created it)
        // Attempt to populate the mask panel; emitter controls were moved to the standalone emitter example.
        try {
            setupMaskPanel();
        } catch (_e) {
            // ignore
        }
    }

    function setupEmitterControls() {
        console.info("[playground:particle-world] setupEmitterControls: attempting to resolve emitter controls");
        emitterToggleButton = resolveElement("emitter-toggle", ["mask-controls", "controls"]);
        // If primary control isn't present yet, signal failure so caller can retry.
        if (!emitterToggleButton) {
            console.warn("[playground:particle-world] setupEmitterControls: emitter-toggle not found");
            return false;
        }
        emitterPpsInput = resolveElement("emitter-pps", ["mask-controls", "controls"]);
        emitterDirectionInput = resolveElement("emitter-direction", ["mask-controls", "controls"]);
        emitterSpreadInput = resolveElement("emitter-spread", ["mask-controls", "controls"]);
        emitterSpeedInput = resolveElement("emitter-speed", ["mask-controls", "controls"]);
        emitterSizeInput = resolveElement("emitter-size", ["mask-controls", "controls"]);
        emitterLifeInput = resolveElement("emitter-life", ["mask-controls", "controls"]);
        emitterMaskIndexInput = resolveElement("emitter-mask-index", ["mask-controls", "controls"]);
        emitterThetaInput = resolveElement("emitter-theta", ["mask-controls", "controls"]);
        emitterPhiInput = resolveElement("emitter-phi", ["mask-controls", "controls"]);
        emitterPosXInput = resolveElement("emitter-pos-x", ["mask-controls", "controls"]);
        emitterPosYInput = resolveElement("emitter-pos-y", ["mask-controls", "controls"]);
        emitterPosZInput = resolveElement("emitter-pos-z", ["mask-controls", "controls"]);
        emitterBurstInput = resolveElement("emitter-burst", ["mask-controls", "controls"]);
        emitterBurstButton = resolveElement("emitter-burst-btn", ["mask-controls", "controls"]);
        emitterMaskSelect = resolveElement("emitter-mask-select", ["mask-controls", "controls"]);
        emitterRandomizeInput = resolveElement("emitter-randomize", ["mask-controls", "controls"]);
        emitterGravXInput = resolveElement("emitter-grav-x", ["mask-controls", "controls"]);
        emitterGravYInput = resolveElement("emitter-grav-y", ["mask-controls", "controls"]);
        emitterGravZInput = resolveElement("emitter-grav-z", ["mask-controls", "controls"]);
        emitterFrictionInput = resolveElement("emitter-friction", ["mask-controls", "controls"]);

        const particleViewer = viewer();
        if (particleViewer && emitterGravXInput && emitterGravYInput && emitterGravZInput) {
            // Initialize viewer gravity/friction to control values
            const gx = Number(emitterGravXInput.value || 0);
            const gy = Number(emitterGravYInput.value || 0);
            const gz = Number(emitterGravZInput.value || 0);
            if (typeof particleViewer.setGravity === "function") particleViewer.setGravity([gx, gy, gz]);
        }
        if (particleViewer && emitterFrictionInput) {
            const f = Number(emitterFrictionInput.value || 0);
            if (typeof particleViewer.setFriction === "function") particleViewer.setFriction(f);
        }

        if (emitterToggleButton) {
            emitterToggleButton.addEventListener("click", () => {
                const pv = viewer();
                if (!pv) return;
                if (!_activeEmitter) {
                    const cfg = buildEmitterConfigFromInputs();
                    try {
                        _activeEmitter = pv.addEmitter(cfg);
                        if (emitterToggleButton) emitterToggleButton.textContent = "Emitter: on";
                    } catch (err) {
                        console.error("Failed to add emitter:", err);
                    }
                } else {
                    if (typeof pv.removeEmitter === "function") pv.removeEmitter();
                    _activeEmitter = null;
                    if (emitterToggleButton) emitterToggleButton.textContent = "Emitter: off";
                }
            });
        }

        // Populate mask select when viewer has masks
        if (emitterMaskSelect) {
            const pv = viewer();
            const masks = pv?.particles?.masks || [];
            // Clear existing options except first
            while (emitterMaskSelect.options.length > 1) emitterMaskSelect.remove(1);
            for (let i = 0; i < masks.length; i++) {
                const opt = document.createElement("option");
                opt.value = String(i);
                opt.text = masks[i].name || `#${i}`;
                emitterMaskSelect.appendChild(opt);
            }
            emitterMaskSelect.addEventListener("change", () => {
                const v = emitterMaskSelect.value;
                const idx = v === "" ? null : Number(v);
                if (_activeEmitter && idx !== null) _activeEmitter.maskIndex = idx;
            });
        }

        if (emitterBurstButton && emitterBurstInput) {
            emitterBurstButton.addEventListener("click", () => {
                const n = Math.max(0, Math.floor(Number(emitterBurstInput.value || 0)));
                if (!_activeEmitter) return;
                try {
                    _activeEmitter.burst(n);
                } catch (err) {
                    console.error("Burst failed:", err);
                }
            });
        }

        // Wire theta/phi/position/randomize inputs to update emitter on change
        const extraInputs = [
            emitterThetaInput,
            emitterPhiInput,
            emitterPosXInput,
            emitterPosYInput,
            emitterPosZInput,
            emitterBurstInput,
            emitterMaskSelect,
            emitterRandomizeInput
        ];
        extraInputs.forEach((el) => {
            if (!el) return;
            el.addEventListener("change", () => {
                if (!_activeEmitter) return;
                const cfg = buildEmitterConfigFromInputs();
                if (cfg.directionVec) _activeEmitter.directionVec = cfg.directionVec;
                if (cfg.position) _activeEmitter.position = cfg.position;
                if (cfg.maskIndex !== null) _activeEmitter.maskIndex = cfg.maskIndex;
            });
        });

        const updateEmitterFromInputs = () => {
            if (!_activeEmitter) return;
            const cfg = buildEmitterConfigFromInputs();
            // Update emitter instance properties directly (EmitterAdapter uses these fields)
            if (Number.isFinite(cfg.particlesPerSecond)) _activeEmitter.rate = cfg.particlesPerSecond;
            if (Number.isFinite(cfg.direction)) _activeEmitter.direction = cfg.direction;
            if (Number.isFinite(cfg.spread)) _activeEmitter.spread = cfg.spread;
            if (Number.isFinite(cfg.speed)) _activeEmitter.speed = cfg.speed;
            if (Number.isFinite(cfg.size)) _activeEmitter.size = cfg.size;
            if (Number.isFinite(cfg.lifespan)) _activeEmitter.life = cfg.lifespan;
            if (cfg.maskIndex !== null) _activeEmitter.maskIndex = cfg.maskIndex;
            if (cfg.position) _activeEmitter.position = cfg.position;
        };

        [
            emitterPpsInput,
            emitterDirectionInput,
            emitterSpreadInput,
            emitterSpeedInput,
            emitterSizeInput,
            emitterLifeInput,
            emitterMaskSelect
        ].forEach((el) => {
            if (!el) return;
            el.addEventListener("change", updateEmitterFromInputs);
            el.addEventListener("input", updateEmitterFromInputs);
        });

        if (emitterGravXInput)
            emitterGravXInput.addEventListener("change", () => {
                const pv = viewer();
                if (!pv || !pv.setGravity) return;
                pv.setGravity([
                    Number(emitterGravXInput.value || 0),
                    Number(emitterGravYInput.value || 0),
                    Number(emitterGravZInput.value || 0)
                ]);
            });
        if (emitterGravYInput)
            emitterGravYInput.addEventListener("change", () => {
                const pv = viewer();
                if (!pv || !pv.setGravity) return;
                pv.setGravity([
                    Number(emitterGravXInput.value || 0),
                    Number(emitterGravYInput.value || 0),
                    Number(emitterGravZInput.value || 0)
                ]);
            });
        if (emitterGravZInput)
            emitterGravZInput.addEventListener("change", () => {
                const pv = viewer();
                if (!pv || !pv.setGravity) return;
                pv.setGravity([
                    Number(emitterGravXInput.value || 0),
                    Number(emitterGravYInput.value || 0),
                    Number(emitterGravZInput.value || 0)
                ]);
            });
        if (emitterFrictionInput)
            emitterFrictionInput.addEventListener("change", () => {
                const pv = viewer();
                if (!pv || !pv.setFriction) return;
                pv.setFriction(Number(emitterFrictionInput.value || 0));
            });
        // Visual debug: highlight control panel so it's obvious in the UI
        try {
            const el = document.getElementById("emitter-controls");
            if (el) {
                el.style.outline = "3px solid magenta";
                el.style.background = "rgba(255,240,200,0.06)";
            }
        } catch (e) {
            // ignore
        }
        console.info("[playground:particle-world] setupEmitterControls: initialized");
        return true;
    }

    function buildEmitterConfigFromInputs() {
        const cfg = {};
        cfg.particlesPerSecond = Number(emitterPpsInput?.value || 0) || 0;
        const deg = Number(emitterDirectionInput?.value || 0) || 0;
        cfg.direction = (deg * Math.PI) / 180; // radians
        const spreadDeg = Number(emitterSpreadInput?.value || 0) || 0;
        cfg.spread = (spreadDeg * Math.PI) / 180;
        cfg.speed = Number(emitterSpeedInput?.value || 0) || 0;
        cfg.size = Number(emitterSizeInput?.value || 0) || 1;
        cfg.lifespan = Number(emitterLifeInput?.value || 0) || 2;
        const maskIndex = Number(emitterMaskSelect?.value ?? emitterMaskIndexInput?.value);
        cfg.maskIndex = Number.isFinite(maskIndex) && maskIndex >= 0 ? Math.floor(maskIndex) : null;
        // Position inputs
        const px = Number(emitterPosXInput?.value || 0) || 0;
        const py = Number(emitterPosYInput?.value || 0) || 0;
        const pz = Number(emitterPosZInput?.value || -2) || -2;
        cfg.x = px;
        cfg.y = py;
        cfg.z = pz;

        // Spherical nozzle: theta (polar), phi (azimuth)
        const thetaDeg = Number(emitterThetaInput?.value || 90) || 90;
        const phiDeg = Number(emitterPhiInput?.value || 0) || 0;
        const theta = (thetaDeg * Math.PI) / 180;
        const phi = (phiDeg * Math.PI) / 180;
        // Convert to Cartesian direction vector
        const dx = Math.sin(theta) * Math.cos(phi);
        const dy = Math.sin(theta) * Math.sin(phi);
        const dz = Math.cos(theta);
        cfg.directionVec = { x: dx, y: dy, z: dz };
        return cfg;
    }

    if (orbitButton) {
        orbitButton.addEventListener("click", () => {
            orbitOn = !orbitOn;
            if (orbitOn) repelOn = false;
            applyMode();
        });
    }

    if (repelButton) {
        repelButton.addEventListener("click", () => {
            repelOn = !repelOn;
            if (repelOn) orbitOn = false;
            applyMode();
        });
    }

    if (randomTargetButton) {
        randomTargetButton.addEventListener("click", () => {
            randomTarget();
        });
    }

    if (applyConfigButton) {
        applyConfigButton.addEventListener("click", () => {
            applyConfigFromInput();
        });
    }

    if (applyMaskButton) {
        applyMaskButton.addEventListener("click", () => {
            const source = String(maskInput?.value || "").trim() || activeMaskSource;
            applyMaskSource(source);
        });
    }

    if (maskInput) {
        maskInput.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            const source = String(maskInput.value || "").trim() || activeMaskSource;
            applyMaskSource(source);
        });
    }

    if (maskAlignInput) {
        maskAlignInput.addEventListener("change", () => {
            syncMaskAlignmentInputs();
        });
    }

    if (maskFileInput) {
        maskFileInput.addEventListener("change", () => {
            const file = maskFileInput.files?.[0];
            if (maskFileName) {
                const fallbackName =
                    typeof maskFileInput.value === "string" && maskFileInput.value.length > 0
                        ? maskFileInput.value.split("\\").pop()
                        : "";
                maskFileName.textContent = file?.name || fallbackName || "No file selected";
            }
            applyMaskFile(file);
        });
    }

    if (browseMaskButton && maskFileInput) {
        browseMaskButton.addEventListener("click", (event) => {
            event.preventDefault();
            openMaskFilePicker();
        });
        browseMaskButton.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            openMaskFilePicker();
        });
    }

    if (clearMaskButton) {
        clearMaskButton.addEventListener("click", () => {
            clearMask();
        });
    }

    syncMaskAlignmentInputs();

    window.addEventListener("pointermove", (event) => {
        targetFromPointer(event);
    });

    world.addEventListener("ready", init, { once: true });
    if (world.ready) init();
}
