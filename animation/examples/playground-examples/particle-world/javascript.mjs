import "../../../components/particle-world.mjs";
import "../../../../forms/juice-forms.mjs";

/**
 * Executes resolveElement.
 * @param {*} id - Parameter value.
 * @param {*} preferredContainers - Parameter value.
 * @returns {*} Result of resolveElement.
 */
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
const envParticlesInput = document.getElementById("env-particles");
const envParticleRadiusInput = document.getElementById("env-particle-radius");
const envParticleTypeInput = document.getElementById("env-particle-type");
const envParticleColorInput = document.getElementById("env-particle-color");
const envDriftInput = document.getElementById("env-drift");
const envDriftSpeedInput = document.getElementById("env-drift-speed");
const envDriftTypeInput = document.getElementById("env-drift-type");
const envOrbitEnabledInput = document.getElementById("env-orbit-enabled");
const envOrbitSpeedInput = document.getElementById("env-orbit-speed");
const envOrbitPullInput = document.getElementById("env-orbit-pull");
const envOrbitReachInput = document.getElementById("env-orbit-reach");
const envRepelEnabledInput = document.getElementById("env-repel-enabled");
const envRepelStrengthInput = document.getElementById("env-repel-strength");
const envRepelReachInput = document.getElementById("env-repel-reach");
const envGravityXInput = document.getElementById("env-gravity-x");
const envGravityYInput = document.getElementById("env-gravity-y");
const envGravityZInput = document.getElementById("env-gravity-z");
const envFrictionInput = document.getElementById("env-friction");
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
    maskParticleGapInput,
    maskDriftInput,
    maskOrbitSpeedInput,
    maskOrbitPullInput,
    maskRepelStrengthInput,
    applyMaskButton,
    clearMaskButton,
    addMaskButton;
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
const maskRuntime = {
    applyMaskSource: null,
    addMaskSource: null,
    clearMask: null,
    syncMaskAlignmentInputs: null
};

/**
 * Executes invokeMaskRuntime.
 * @param {*} action - Parameter value.
 * @param {*} args - Parameter value.
 * @returns {*} Result of invokeMaskRuntime.
 */
function invokeMaskRuntime(action, ...args) {
    const fn = maskRuntime[action];
    if (typeof fn !== "function") return;
    return fn(...args);
}

/**
 * Creates and returns maskfieldsetmarkup data.
 * @param {*} suffix - Parameter value.
 * @param {*} index - Parameter value.
 * @returns {*} Result of createMaskFieldsetMarkup.
 */
function createMaskFieldsetMarkup(suffix = "", index = 1) {
    const label = index === 1 ? "Mask" : `Mask ${index}`;
    return `
    <input-fieldset class="mask-fieldset" data-mask-index="${index}" label="${label}">
    <input-text id="mask-src${suffix}" inline label="Mask URL" placeholder="https://... or data:"></input-text>
    <div class="controls-mask-row">
        <label>File</label>
        <div class="file-picker">
            <button id="browse-mask${suffix}" class="file-picker-trigger" type="button">Browse</button>
            <input id="mask-file${suffix}" type="file" accept=".png,image/png,image/*" />
            <div id="mask-file-name${suffix}">No file selected</div>
        </div>
    </div>
    <input-number id="mask-width${suffix}" inline label="Width %" type="number" min="1" max="100" step="0.1" default="100" value="100" units="%"></input-number>
    <input-number id="mask-height${suffix}" inline label="Height %" type="number" min="1" max="100" step="0.1" default="100" value="100" units="%"></input-number>
    <input-select id="mask-align${suffix}" inline label="Align" options="center:Center,top-left:Top Left,top-center:Top Center,top-right:Top Right,center-left:Center Left,center-right:Center Right,bottom-left:Bottom Left,bottom-center:Bottom Center,bottom-right:Bottom Right,custom:Custom" value="center"></input-select>
    <div class="controls-mask-row inline-fields">
        <input-number id="mask-align-x${suffix}" inline label="Align X" type="number" min="-1" max="1" step="0.01" default="0" value="0"></input-number>
        <input-number id="mask-align-y${suffix}" inline label="Align Y" type="number" min="-1" max="1" step="0.01" default="0" value="0"></input-number>
    </div>
    <div class="controls-mask-row inline-fields-4">
        <input-select id="mask-color-mode${suffix}" inline label="Color" options="single:Single Color,preserve:Use Mask Pixels" value="single"></input-select>
        <input-number id="mask-particle-gap${suffix}" inline label="Particle Gap" type="number" min="0" max="32" step="1" default="1" value="1"></input-number>
        <input-number id="mask-drift${suffix}" inline label="Drift" type="number" min="0" max="1" step="0.01" default="0.1" value="0.1"></input-number>
        <input-number id="mask-orbit-speed${suffix}" inline label="Orbit Speed" type="number" min="0" max="10" step="0.1" default="1.5" value="1.5"></input-number>
    </div>
    <div class="controls-mask-row inline-fields-4">
        <input-number id="mask-orbit-pull${suffix}" inline label="Orbit Pull" type="number" min="0" max="10" step="0.1" default="1" value="1"></input-number>
        <input-number id="mask-repel-strength${suffix}" inline label="Repel Strength" type="number" min="0" max="10" step="0.1" default="1" value="1"></input-number>
    </div>
    <div class="controls-mask-actions">
        <button id="apply-mask${suffix}" type="button">Apply Mask</button>
        <button id="clear-mask${suffix}" type="button">Clear Mask</button>
    </div>
    </input-fieldset>`;
}

/**
 * Creates and returns maskpanelmarkup data.
 * @returns {*} Result of createMaskPanelMarkup.
 */
function createMaskPanelMarkup() {
    return `
<div class="controls-mask">
    <div id="mask-fieldsets">
    ${createMaskFieldsetMarkup("", 1)}
    </div>
    <div class="controls-mask-actions controls-mask-add">
        <button id="add-mask" type="button">Add Another Mask</button>
    </div>
</div>
`;
}

/**
 * Executes resolveMaskControls.
 * @param {*} suffix - Parameter value.
 * @returns {*} Result of resolveMaskControls.
 */
function resolveMaskControls(suffix = "") {
    const id = (name) => `${name}${suffix}`;
    return {
        sourceInput: resolveElement(id("mask-src"), ["mask-controls", "controls"]),
        fileInput: resolveElement(id("mask-file"), ["mask-controls", "controls"]),
        browseButton: resolveElement(id("browse-mask"), ["mask-controls", "controls"]),
        fileName: resolveElement(id("mask-file-name"), ["mask-controls", "controls"]),
        widthInput: resolveElement(id("mask-width"), ["mask-controls", "controls"]),
        heightInput: resolveElement(id("mask-height"), ["mask-controls", "controls"]),
        alignInput: resolveElement(id("mask-align"), ["mask-controls", "controls"]),
        alignXInput: resolveElement(id("mask-align-x"), ["mask-controls", "controls"]),
        alignYInput: resolveElement(id("mask-align-y"), ["mask-controls", "controls"]),
        colorModeInput: resolveElement(id("mask-color-mode"), ["mask-controls", "controls"]),
        particleGapInput:
            resolveElement(id("mask-particle-gap"), ["mask-controls", "controls"]) ||
            resolveElement(id("mask-particles"), ["mask-controls", "controls"]),
        driftInput: resolveElement(id("mask-drift"), ["mask-controls", "controls"]),
        orbitSpeedInput: resolveElement(id("mask-orbit-speed"), ["mask-controls", "controls"]),
        orbitPullInput: resolveElement(id("mask-orbit-pull"), ["mask-controls", "controls"]),
        repelStrengthInput: resolveElement(id("mask-repel-strength"), ["mask-controls", "controls"]),
        applyButton: resolveElement(id("apply-mask"), ["mask-controls", "controls"]),
        clearButton: resolveElement(id("clear-mask"), ["mask-controls", "controls"])
    };
}

/**
 * Executes syncSingleMaskAlignmentInputs.
 * @param {*} controls - Parameter value.
 * @returns {*} Result of syncSingleMaskAlignmentInputs.
 */
function syncSingleMaskAlignmentInputs(controls) {
    const isCustom = (controls?.alignInput?.value || "center") === "custom";
    if (controls?.alignXInput) controls.alignXInput.disabled = !isCustom;
    if (controls?.alignYInput) controls.alignYInput.disabled = !isCustom;
}

/**
 * Executes bindMaskControlEvents.
 * @param {*} controls - Parameter value.
 * @param {*} param2 - Parameter value.
 * @returns {*} Result of bindMaskControlEvents.
 */
function bindMaskControlEvents(controls, { addMode = "apply" } = {}) {
    if (!controls) return;
    const runtimeAction = addMode === "add" ? "addMaskSource" : "applyMaskSource";
    const readSourceFromControl = () => {
        const direct = controls.sourceInput?.value;
        if (direct !== null && direct !== undefined && String(direct).trim().length > 0) {
            return String(direct).trim();
        }
        const attr = controls.sourceInput?.getAttribute?.("value");
        if (attr !== null && attr !== undefined && String(attr).trim().length > 0) {
            return String(attr).trim();
        }
        const cached = controls.__lastMaskSource;
        if (cached !== null && cached !== undefined && String(cached).trim().length > 0) {
            return String(cached).trim();
        }
        return "";
    };
    const applyFromSource = (source) => {
        const src = String(source || "").trim() || readSourceFromControl();
        if (!src) return;
        controls.__lastMaskSource = src;
        invokeMaskRuntime(runtimeAction, src, { controls, syncSourceInput: false });
    };
    const openPicker = () => {
        if (!controls.fileInput) return;
        controls.fileInput.value = "";
        try {
            if (typeof controls.fileInput.showPicker === "function") {
                controls.fileInput.showPicker();
                return;
            }
        } catch (_error) {
            // Fall through to click() fallback.
        }
        controls.fileInput.click();
    };

    if (controls.applyButton && !controls.applyButton.__maskBound) {
        controls.applyButton.__maskBound = true;
        controls.applyButton.addEventListener("click", () => {
            applyFromSource(readSourceFromControl());
        });
    }

    if (controls.sourceInput && !controls.sourceInput.__maskBoundEnter) {
        controls.sourceInput.__maskBoundEnter = true;
        controls.sourceInput.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            applyFromSource(readSourceFromControl());
        });
    }

    if (controls.sourceInput && !controls.sourceInput.__maskBoundSourceTrack) {
        controls.sourceInput.__maskBoundSourceTrack = true;
        const trackSource = () => {
            const src = readSourceFromControl();
            if (src) controls.__lastMaskSource = src;
        };
        controls.sourceInput.addEventListener("input", trackSource);
        controls.sourceInput.addEventListener("change", trackSource);
    }

    if (controls.alignInput && !controls.alignInput.__maskBoundChange) {
        controls.alignInput.__maskBoundChange = true;
        controls.alignInput.addEventListener("change", () => {
            syncSingleMaskAlignmentInputs(controls);
            invokeMaskRuntime("syncMaskAlignmentInputs", controls);
        });
    }

    if (controls.fileInput && !controls.fileInput.__maskBoundFile) {
        controls.fileInput.__maskBoundFile = true;
        controls.fileInput.addEventListener("change", () => {
            const file = controls.fileInput.files?.[0];
            if (controls.fileName) {
                const fallbackName =
                    typeof controls.fileInput.value === "string" && controls.fileInput.value.length > 0
                        ? controls.fileInput.value.split("\\").pop()
                        : "";
                controls.fileName.textContent = file?.name || fallbackName || "No file selected";
            }
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = typeof reader.result === "string" ? reader.result : "";
                if (!dataUrl) return;
                controls.__lastMaskSource = dataUrl;
                if (controls.sourceInput) {
                    controls.sourceInput.value = dataUrl;
                    if (typeof controls.sourceInput.setAttribute === "function") {
                        controls.sourceInput.setAttribute("value", dataUrl);
                    }
                }
                invokeMaskRuntime(runtimeAction, dataUrl, { controls, syncSourceInput: true });
            };
            reader.readAsDataURL(file);
        });
    }

    if (controls.browseButton && controls.fileInput && !controls.browseButton.__maskBoundBrowse) {
        controls.browseButton.__maskBoundBrowse = true;
        controls.browseButton.addEventListener("click", (event) => {
            event.preventDefault();
            openPicker();
        });
        controls.browseButton.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            openPicker();
        });
    }

    if (controls.clearButton && !controls.clearButton.__maskBoundClear) {
        controls.clearButton.__maskBoundClear = true;
        controls.clearButton.addEventListener("click", () => {
            invokeMaskRuntime("clearMask");
        });
    }

    syncSingleMaskAlignmentInputs(controls);
}

/**
 * Sets upmaskpanel values.
 * @returns {*} Result of setupMaskPanel.
 */
function setupMaskPanel() {
    // Support both playground drawer containers and direct controls.html markup.
    const panel =
        document.getElementById("mask-controls") ||
        document.querySelector(".controls-mask[data-mask-placeholder]") ||
        document.querySelector(".controls-mask");
    if (!panel) return false;
    const hasMaskControls = Boolean(panel.querySelector("#mask-src"));
    // If `panel` is the placeholder `.controls-mask`, replace it with full markup; otherwise set innerHTML of the wrapper.
    if (panel.classList && panel.classList.contains("controls-mask") && panel.hasAttribute("data-mask-placeholder")) {
        panel.outerHTML = createMaskPanelMarkup();
    } else if (panel.id === "mask-controls" && !hasMaskControls) {
        panel.innerHTML = createMaskPanelMarkup();
    }

    let fieldsetsContainer = resolveElement("mask-fieldsets", ["mask-controls", "controls"]);
    if (!fieldsetsContainer) {
        if (panel.id === "mask-controls") {
            panel.innerHTML = createMaskPanelMarkup();
            fieldsetsContainer = resolveElement("mask-fieldsets", ["mask-controls", "controls"]);
        }
    }
    if (!fieldsetsContainer) return false;
    if (!panel.__maskPanelInitialized) {
        const fieldsets = Array.from(fieldsetsContainer.querySelectorAll("input-fieldset"));
        for (let i = 0; i < fieldsets.length; i += 1) {
            const fieldset = fieldsets[i];
            if (i === 0) {
                fieldset.classList.add("mask-fieldset");
                fieldset.setAttribute("data-mask-index", "1");
                continue;
            }
            fieldset.remove();
        }
        panel.__maskPanelInitialized = true;
    }

    const primaryControls = resolveMaskControls("");
    maskInput = primaryControls.sourceInput;
    maskFileInput = primaryControls.fileInput;
    browseMaskButton = primaryControls.browseButton;
    maskFileName = primaryControls.fileName;
    maskWidthInput = primaryControls.widthInput;
    maskHeightInput = primaryControls.heightInput;
    maskAlignInput = primaryControls.alignInput;
    maskAlignXInput = primaryControls.alignXInput;
    maskAlignYInput = primaryControls.alignYInput;
    maskColorModeInput = primaryControls.colorModeInput;
    maskParticleGapInput = primaryControls.particleGapInput;
    maskDriftInput = primaryControls.driftInput;
    maskOrbitSpeedInput = primaryControls.orbitSpeedInput;
    maskOrbitPullInput = primaryControls.orbitPullInput;
    maskRepelStrengthInput = primaryControls.repelStrengthInput;
    applyMaskButton = primaryControls.applyButton;
    clearMaskButton = primaryControls.clearButton;
    addMaskButton = resolveElement("add-mask", ["mask-controls", "controls"]);
    bindMaskControlEvents(primaryControls, { addMode: "apply" });

    const bindSecondaryControls = () => {
        const secondaryControls = resolveMaskControls("-2");
        if (!secondaryControls.sourceInput) return;
        bindMaskControlEvents(secondaryControls, { addMode: "add" });
    };
    if (fieldsetsContainer.querySelector('.mask-fieldset[data-mask-index="2"]')) {
        bindSecondaryControls();
        if (addMaskButton) addMaskButton.style.display = "none";
    }

    if (addMaskButton && !addMaskButton.__maskAddBound) {
        addMaskButton.__maskAddBound = true;
        addMaskButton.addEventListener("click", (event) => {
            event.preventDefault();
            if (fieldsetsContainer.querySelector('.mask-fieldset[data-mask-index="2"]')) return;
            fieldsetsContainer.insertAdjacentHTML("beforeend", createMaskFieldsetMarkup("-2", 2));
            bindSecondaryControls();
            addMaskButton.style.display = "none";
        });
    }

    const extraAddButtons = Array.from(panel.querySelectorAll("#add-mask"));
    for (let i = 1; i < extraAddButtons.length; i += 1) {
        extraAddButtons[i].remove();
    }

    invokeMaskRuntime("syncMaskAlignmentInputs");
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
    let lastPointerPosition = null;
    const maskDimensionsCache = new Map();
    let environmentControlsBound = false;
    const environmentState = {
        particles: parsePositiveInt(getControlValue(envParticlesInput)) ?? 500,
        particleRadius: parsePositiveNumber(getControlValue(envParticleRadiusInput)) ?? 0.4,
        particleType: String(getControlValue(envParticleTypeInput) || "sphere"),
        particleColor: parseColorHex(getControlValue(envParticleColorInput)) ?? "#ffffff",
        drift: parseNumber(getControlValue(envDriftInput)) ?? 0.1,
        driftSpeed: parseNonNegativeNumber(getControlValue(envDriftSpeedInput)) ?? 1,
        driftType: parseDriftType(getControlValue(envDriftTypeInput)) ?? "relative",
        orbitSpeed: parseNumber(getControlValue(envOrbitSpeedInput)) ?? 1.5,
        orbitPull: parseNumber(getControlValue(envOrbitPullInput)) ?? 1,
        repelStrength: parseNumber(getControlValue(envRepelStrengthInput)) ?? 1,
        orbitReach: parseNonNegativeNumber(getControlValue(envOrbitReachInput)) ?? 1.2,
        repelReach: parseNonNegativeNumber(getControlValue(envRepelReachInput)) ?? 1.2,
        gravityX: parseNumber(getControlValue(envGravityXInput)) ?? 0,
        gravityY: parseNumber(getControlValue(envGravityYInput)) ?? 0,
        gravityZ: parseNumber(getControlValue(envGravityZInput)) ?? 0,
        friction: parseNumber(getControlValue(envFrictionInput)) ?? 0
    };

    function viewer() {
        return world.particleViewer || null;
    }

    function resolveFieldRadius(reachValue) {
        const reach = parseNonNegativeNumber(reachValue);
        if (reach === null || reach <= 0) return null;

        const particleViewer = viewer();
        const projection = particleViewer?.particles?.projection;
        if (!projection || typeof projection.getBoundsAtDepth !== "function") {
            return reach;
        }

        try {
            const depth = Number(target.z);
            const bounds = projection.getBoundsAtDepth(depth);
            if (!bounds) return reach;

            const corners = [
                [Number(bounds.left), Number(bounds.top)],
                [Number(bounds.right), Number(bounds.top)],
                [Number(bounds.left), Number(bounds.bottom)],
                [Number(bounds.right), Number(bounds.bottom)]
            ];
            let maxDistance = 0;
            for (let i = 0; i < corners.length; i += 1) {
                const corner = corners[i];
                const dx = corner[0] - Number(target.x);
                const dy = corner[1] - Number(target.y);
                const distance = Math.hypot(dx, dy);
                if (Number.isFinite(distance) && distance > maxDistance) {
                    maxDistance = distance;
                }
            }
            if (!(maxDistance > 0)) return reach;
            // Reach is normalized to viewport size: 1 means full visible coverage from the current target.
            return reach * maxDistance;
        } catch (_error) {
            return reach;
        }
    }

    function syncInteractionForces() {
        const resolvedOrbitFieldRadius = resolveFieldRadius(orbitFieldRadius);
        const resolvedRepelFieldRadius = resolveFieldRadius(repelFieldRadius);
        if (typeof world.setOrbit === "function" && typeof world.setRepel === "function") {
            world.setOrbit(orbitOn, {
                x: target.x,
                y: target.y,
                z: target.z,
                radius: orbitRadius,
                fieldRadius: resolvedOrbitFieldRadius
            });
            world.setRepel(repelOn, {
                x: target.x,
                y: target.y,
                z: target.z,
                radius: repelRadius,
                fieldRadius: resolvedRepelFieldRadius
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
        if (resolvedOrbitFieldRadius !== null) particleViewer.setValue("orbitFieldRadius", resolvedOrbitFieldRadius);
        if (resolvedRepelFieldRadius !== null) particleViewer.setValue("repelFieldRadius", resolvedRepelFieldRadius);
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
        syncModeToggleInputs();
        syncInteractionForces();
        if ((orbitOn || repelOn) && lastPointerPosition) {
            targetFromPointer(lastPointerPosition);
        }
    }

    function parseNumber(value) {
        if (value === null || value === undefined) return null;
        const text = String(value).trim();
        if (!text.length) return null;
        const n = Number(text);
        return Number.isFinite(n) ? n : null;
    }

    function getControlValue(control) {
        if (!control) return null;

        const directValue = control.value;
        if (directValue !== null && directValue !== undefined && String(directValue).trim().length > 0) {
            return directValue;
        }

        if (typeof control.getAttribute === "function") {
            const attributeValue = control.getAttribute("value");
            if (attributeValue !== null && String(attributeValue).trim().length > 0) {
                return attributeValue;
            }
            const defaultValue = control.getAttribute("default");
            if (defaultValue !== null && String(defaultValue).trim().length > 0) {
                return defaultValue;
            }
        }

        return null;
    }

    function parseBooleanish(value) {
        if (value === true || value === false) return value;
        if (value === 1 || value === 0) return value === 1;
        if (value === null || value === undefined) return null;
        const text = String(value).trim().toLowerCase();
        if (!text.length) return null;
        if (text === "true" || text === "1" || text === "yes" || text === "on" || text === "checked") return true;
        if (text === "false" || text === "0" || text === "no" || text === "off" || text === "unchecked")
            return false;
        return null;
    }

    function getControlChecked(control) {
        if (!control) return false;
        if (typeof control.checked === "boolean") return control.checked;
        const checkedAttr = typeof control.getAttribute === "function" ? control.getAttribute("checked") : null;
        if (checkedAttr !== null) {
            const parsed = parseBooleanish(checkedAttr);
            return parsed === null ? true : parsed;
        }
        const parsedValue = parseBooleanish(getControlValue(control));
        return parsedValue === true;
    }

    function setControlChecked(control, checked) {
        if (!control) return;
        const next = !!checked;
        if (typeof control.checked === "boolean") control.checked = next;
        if (typeof control.setAttribute === "function") {
            control.setAttribute("value", next ? "true" : "false");
            if (next) {
                control.setAttribute("checked", "true");
            } else if (typeof control.removeAttribute === "function") {
                control.removeAttribute("checked");
            }
        }
    }

    function syncModeToggleInputs() {
        setControlChecked(envOrbitEnabledInput, orbitOn);
        setControlChecked(envRepelEnabledInput, repelOn);
    }

    function syncModeFromToggleInputs(prefer = null) {
        let nextOrbit = getControlChecked(envOrbitEnabledInput);
        let nextRepel = getControlChecked(envRepelEnabledInput);
        if (nextOrbit && nextRepel) {
            if (prefer === "orbit") {
                nextRepel = false;
            } else if (prefer === "repel") {
                nextOrbit = false;
            } else {
                nextRepel = false;
            }
        }
        orbitOn = nextOrbit;
        repelOn = nextRepel;
        applyMode();
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

    function parseNonNegativeNumber(value) {
        const parsed = parseNumber(value);
        return parsed !== null && parsed >= 0 ? parsed : null;
    }

    function parseNonNegativeInt(value) {
        const parsed = parseNumber(value);
        if (parsed === null) return null;
        const next = Math.floor(parsed);
        return next >= 0 ? next : null;
    }

    function parseDriftType(value) {
        if (typeof value !== "string") return null;
        const next = value.trim().toLowerCase();
        if (next === "relative" || next === "absolute") return next;
        return null;
    }

    function parseColorHex(value) {
        if (typeof value !== "string") return null;
        const text = value.trim().toLowerCase();
        const short = /^#([0-9a-f]{3})$/;
        const full = /^#([0-9a-f]{6})$/;
        if (full.test(text)) return text;
        const shortMatch = text.match(short);
        if (!shortMatch) return null;
        const rgb = shortMatch[1];
        return `#${rgb[0]}${rgb[0]}${rgb[1]}${rgb[1]}${rgb[2]}${rgb[2]}`;
    }

    function buildEnvironmentFromInputs() {
        return {
            particles: parsePositiveInt(getControlValue(envParticlesInput)),
            particleRadius: parsePositiveNumber(getControlValue(envParticleRadiusInput)),
            particleType: (() => {
                const value = getControlValue(envParticleTypeInput);
                return typeof value === "string" ? value : null;
            })(),
            particleColor: parseColorHex(getControlValue(envParticleColorInput)),
            drift: parseNumber(getControlValue(envDriftInput)),
            driftSpeed: parseNonNegativeNumber(getControlValue(envDriftSpeedInput)),
            driftType: parseDriftType(getControlValue(envDriftTypeInput)),
            orbitSpeed: parseNumber(getControlValue(envOrbitSpeedInput)),
            orbitPull: parseNumber(getControlValue(envOrbitPullInput)),
            repelStrength: parseNumber(getControlValue(envRepelStrengthInput)),
            orbitReach: parseNonNegativeNumber(getControlValue(envOrbitReachInput)),
            repelReach: parseNonNegativeNumber(getControlValue(envRepelReachInput)),
            gravityX: parseNumber(getControlValue(envGravityXInput)),
            gravityY: parseNumber(getControlValue(envGravityYInput)),
            gravityZ: parseNumber(getControlValue(envGravityZInput)),
            friction: parseNumber(getControlValue(envFrictionInput))
        };
    }

    function syncEnvironmentInputs() {
        if (envParticlesInput) envParticlesInput.value = String(environmentState.particles);
        if (envParticleRadiusInput) envParticleRadiusInput.value = String(environmentState.particleRadius);
        if (envParticleTypeInput) envParticleTypeInput.value = String(environmentState.particleType);
        if (envParticleColorInput) envParticleColorInput.value = String(environmentState.particleColor);
        if (envDriftInput) envDriftInput.value = String(environmentState.drift);
        if (envDriftSpeedInput) envDriftSpeedInput.value = String(environmentState.driftSpeed);
        if (envDriftTypeInput) envDriftTypeInput.value = String(environmentState.driftType);
        if (envOrbitSpeedInput) envOrbitSpeedInput.value = String(environmentState.orbitSpeed);
        if (envOrbitPullInput) envOrbitPullInput.value = String(environmentState.orbitPull);
        if (envRepelStrengthInput) envRepelStrengthInput.value = String(environmentState.repelStrength);
        if (envOrbitReachInput) envOrbitReachInput.value = String(environmentState.orbitReach);
        if (envRepelReachInput) envRepelReachInput.value = String(environmentState.repelReach);
        if (envGravityXInput) envGravityXInput.value = String(environmentState.gravityX);
        if (envGravityYInput) envGravityYInput.value = String(environmentState.gravityY);
        if (envGravityZInput) envGravityZInput.value = String(environmentState.gravityZ);
        if (envFrictionInput) envFrictionInput.value = String(environmentState.friction);
    }

    function applyEnvironmentOptions(next = {}) {
        const update = next && typeof next === "object" ? next : {};
        const applyNumber = (key, value, opts = {}) => {
            if (value === null || value === undefined) return;
            const n = Number(value);
            if (!Number.isFinite(n)) return;
            let next = n;
            if (opts.min !== undefined && next < opts.min) next = opts.min;
            if (opts.max !== undefined && next > opts.max) next = opts.max;
            environmentState[key] = next;
        };
        const applyInt = (key, value, opts = {}) => {
            if (value === null || value === undefined) return;
            const n = Math.floor(Number(value));
            if (!Number.isFinite(n)) return;
            if (opts.min !== undefined && n < opts.min) return;
            environmentState[key] = n;
        };
        const applyString = (key, value) => {
            if (typeof value !== "string") return;
            const text = value.trim();
            if (!text.length) return;
            environmentState[key] = text;
        };
        const applyDriftType = (value) => {
            const next = parseDriftType(value);
            if (!next) return;
            environmentState.driftType = next;
        };
        const applyParticleColor = (value) => {
            const next = parseColorHex(value);
            if (!next) return;
            environmentState.particleColor = next;
        };

        applyInt("particles", update.particles, { min: 8 });
        applyNumber("particleRadius", update.particleRadius, { min: 0 });
        applyString("particleType", update.particleType);
        applyParticleColor(update.particleColor);
        applyNumber("drift", update.drift, { min: 0, max: 1 });
        applyNumber("driftSpeed", update.driftSpeed, { min: 0, max: 5 });
        applyDriftType(update.driftType);
        applyNumber("orbitSpeed", update.orbitSpeed);
        applyNumber("orbitPull", update.orbitPull);
        applyNumber("repelStrength", update.repelStrength);
        applyNumber("orbitReach", update.orbitReach, { min: 0 });
        applyNumber("repelReach", update.repelReach, { min: 0 });
        applyNumber("gravityX", update.gravityX);
        applyNumber("gravityY", update.gravityY);
        applyNumber("gravityZ", update.gravityZ);
        applyNumber("friction", update.friction);

        if (typeof world.setParticleCount === "function") {
            world.setParticleCount(environmentState.particles);
        }

        if (typeof world.applyMotionConfig === "function") {
            world.applyMotionConfig({
                drift: environmentState.drift,
                driftSpeed: environmentState.driftSpeed,
                driftType: environmentState.driftType,
                orbitSpeed: environmentState.orbitSpeed,
                orbitPull: environmentState.orbitPull,
                repelStrength: environmentState.repelStrength
            });
        } else {
            const particleViewer = viewer();
            if (particleViewer) {
                particleViewer.setValue("driftScale", Number(environmentState.drift));
                particleViewer.setValue("driftSpeedScale", Number(environmentState.driftSpeed));
                particleViewer.setValue("driftType", environmentState.driftType);
                particleViewer.setValue("orbitSpeedScale", Number(environmentState.orbitSpeed));
                particleViewer.setValue("orbitPullScale", Number(environmentState.orbitPull));
                particleViewer.setValue("repelStrengthScale", Number(environmentState.repelStrength));
            }
        }

        const particleViewer = viewer();
        if (particleViewer && typeof particleViewer.setGravity === "function") {
            particleViewer.setGravity([
                Number(environmentState.gravityX),
                Number(environmentState.gravityY),
                Number(environmentState.gravityZ)
            ]);
        }
        if (particleViewer && typeof particleViewer.setFriction === "function") {
            particleViewer.setFriction(Number(environmentState.friction));
        }

        const radius = Number(environmentState.particleRadius);
        if (Number.isFinite(radius) && radius > 0) {
            orbitRadius = radius;
            repelRadius = radius;
            target.r = radius;
            if (tr) tr.textContent = radius.toFixed(2);
        }

        const orbitReach = Number(environmentState.orbitReach);
        orbitFieldRadius = Number.isFinite(orbitReach) && orbitReach > 0 ? orbitReach : null;
        const repelReach = Number(environmentState.repelReach);
        repelFieldRadius = Number.isFinite(repelReach) && repelReach > 0 ? repelReach : null;

        if (typeof world.setValue === "function") {
            world.setValue("particleType", environmentState.particleType);
        }
        if (typeof world.setParticleColor === "function") {
            world.setParticleColor(environmentState.particleColor);
        } else if (particleViewer && typeof particleViewer.setParticleColor === "function") {
            particleViewer.setParticleColor(environmentState.particleColor);
        }

        syncInteractionForces();
        syncEnvironmentInputs();
    }

    function setupEnvironmentControls() {
        if (environmentControlsBound) return;
        environmentControlsBound = true;

        const apply = () => {
            applyEnvironmentOptions(buildEnvironmentFromInputs());
        };

        [
            envParticlesInput,
            envParticleRadiusInput,
            envParticleTypeInput,
            envParticleColorInput,
            envDriftInput,
            envDriftSpeedInput,
            envDriftTypeInput,
            envOrbitSpeedInput,
            envOrbitPullInput,
            envRepelStrengthInput,
            envOrbitReachInput,
            envRepelReachInput,
            envGravityXInput,
            envGravityYInput,
            envGravityZInput,
            envFrictionInput
        ].forEach((input) => {
            if (!input) return;
            input.addEventListener("change", apply);
        });

        if (envOrbitEnabledInput) {
            envOrbitEnabledInput.addEventListener("change", () => {
                syncModeFromToggleInputs("orbit");
            });
            envOrbitEnabledInput.addEventListener("input", () => {
                syncModeFromToggleInputs("orbit");
            });
        }

        if (envRepelEnabledInput) {
            envRepelEnabledInput.addEventListener("change", () => {
                syncModeFromToggleInputs("repel");
            });
            envRepelEnabledInput.addEventListener("input", () => {
                syncModeFromToggleInputs("repel");
            });
        }
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

    function syncMaskAlignmentInputs(controls = null) {
        const alignInput = controls?.alignInput ?? maskAlignInput;
        const alignXInput = controls?.alignXInput ?? maskAlignXInput;
        const alignYInput = controls?.alignYInput ?? maskAlignYInput;
        const isCustom = (alignInput?.value || "center") === "custom";
        if (alignXInput) alignXInput.disabled = !isCustom;
        if (alignYInput) alignYInput.disabled = !isCustom;
    }

    async function buildMaskOptions(source, controls = null) {
        const options = {};
        const widthInput = controls?.widthInput ?? maskWidthInput;
        const heightInput = controls?.heightInput ?? maskHeightInput;
        const alignInput = controls?.alignInput ?? maskAlignInput;
        const alignXInput = controls?.alignXInput ?? maskAlignXInput;
        const alignYInput = controls?.alignYInput ?? maskAlignYInput;
        const colorModeInput = controls?.colorModeInput ?? maskColorModeInput;
        const particleGapInput = controls?.particleGapInput ?? maskParticleGapInput;
        let widthPercent = sanitizeSize(parseNumber(widthInput?.value));
        let heightPercent = sanitizeSize(parseNumber(heightInput?.value));

        if (widthPercent !== null || heightPercent !== null) {
            try {
                const dimensions = await getMaskDimensions(source);
                if (dimensions && dimensions.width > 0 && dimensions.height > 0) {
                    if (widthPercent !== null && heightPercent === null) {
                        heightPercent = (widthPercent * dimensions.height) / dimensions.width;
                    } else if (heightPercent !== null && widthPercent === null) {
                        widthPercent = (heightPercent * dimensions.width) / dimensions.height;
                    }
                }
            } catch (_error) {
                // If we cannot read image dimensions, keep provided values as-is.
            }

            if (widthPercent === null && heightPercent !== null) widthPercent = heightPercent;
            if (heightPercent === null && widthPercent !== null) heightPercent = widthPercent;
            widthPercent = sanitizeSize(widthPercent);
            heightPercent = sanitizeSize(heightPercent);
            if (widthPercent !== null) widthPercent = Math.max(1, Math.min(100, widthPercent));
            if (heightPercent !== null) heightPercent = Math.max(1, Math.min(100, heightPercent));

            if (widthPercent !== null || heightPercent !== null) {
                options.contentBox = {};
                if (widthPercent !== null) options.contentBox.width = widthPercent / 100;
                if (heightPercent !== null) options.contentBox.height = heightPercent / 100;
            }
        }

        const scaleX = options.contentBox?.width ?? 1;
        const scaleY = options.contentBox?.height ?? 1;
        const align = String(alignInput?.value || "center").toLowerCase();

        if (align === "custom") {
            const customX = parseNumber(alignXInput?.value);
            const customY = parseNumber(alignYInput?.value);
            if (customX !== null || customY !== null) {
                options.position = {};
                if (customX !== null) options.position.x = customX;
                if (customY !== null) options.position.y = customY;
            }
        } else {
            const offset = alignmentOffset(align, scaleX, scaleY);
            options.position = { x: offset.x, y: offset.y };
        }

        options.preserveColor = (colorModeInput?.value || "single") === "preserve";
        const particleGap = parseNonNegativeInt(particleGapInput?.value);
        if (particleGap !== null) {
            options.particleGap = Math.max(0, Math.min(32, particleGap));
        }
        return options;
    }

    function buildMaskEnvironmentOptions(controls = null) {
        const driftInput = controls?.driftInput ?? maskDriftInput;
        const orbitSpeedInput = controls?.orbitSpeedInput ?? maskOrbitSpeedInput;
        const orbitPullInput = controls?.orbitPullInput ?? maskOrbitPullInput;
        const repelStrengthInput = controls?.repelStrengthInput ?? maskRepelStrengthInput;
        const env = {
            drift: parseNumber(driftInput?.value),
            orbitSpeed: parseNumber(orbitSpeedInput?.value),
            orbitPull: parseNumber(orbitPullInput?.value),
            repelStrength: parseNumber(repelStrengthInput?.value)
        };
        return env;
    }

    function applyMaskEnvironmentOptions(controls = null) {
        const env = buildMaskEnvironmentOptions(controls);
        applyEnvironmentOptions(env);
    }

    async function applyMaskSource(source, options = {}) {
        const { maskOptions = null, syncSourceInput = true, controls = null } = options;
        const src = String(source || "").trim();
        if (!src || typeof world.setMask !== "function") return;
        try {
            if (controls) controls.__lastMaskSource = src;
            const sourceInput = controls?.sourceInput ?? maskInput;
            if (syncSourceInput && sourceInput) {
                sourceInput.value = src;
                if (typeof sourceInput.setAttribute === "function") {
                    sourceInput.setAttribute("value", src);
                }
            }
            applyMaskEnvironmentOptions(controls);
            const resolvedOptions =
                maskOptions && typeof maskOptions === "object" ? maskOptions : await buildMaskOptions(src, controls);
            await world.setMask(src, resolvedOptions);
            activeMaskSource = src;
        } catch (error) {
            console.error("[playground:particle-world] Failed to load mask:", error);
        }
    }

    async function addMaskSource(source, options = {}) {
        const { maskOptions = null, syncSourceInput = true, controls = null } = options;
        const src = String(source || "").trim();
        if (!src) return;

        try {
            if (controls) controls.__lastMaskSource = src;
            const sourceInput = controls?.sourceInput ?? maskInput;
            if (syncSourceInput && sourceInput) {
                sourceInput.value = src;
                if (typeof sourceInput.setAttribute === "function") {
                    sourceInput.setAttribute("value", src);
                }
            }
            applyMaskEnvironmentOptions(controls);
            const resolvedOptions =
                maskOptions && typeof maskOptions === "object" ? maskOptions : await buildMaskOptions(src, controls);

            if (typeof world.loadMask === "function") {
                await world.loadMask(src, { apply: true, ...resolvedOptions });
                activeMaskSource = src;
                return;
            }

            await applyMaskSource(src, { maskOptions: resolvedOptions, syncSourceInput, controls });
        } catch (error) {
            console.error("[playground:particle-world] Failed to add mask:", error);
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

    maskRuntime.applyMaskSource = applyMaskSource;
    maskRuntime.addMaskSource = addMaskSource;
    maskRuntime.clearMask = clearMask;
    maskRuntime.syncMaskAlignmentInputs = syncMaskAlignmentInputs;

    function applyMaskFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = typeof reader.result === "string" ? reader.result : "";
            if (!dataUrl) return;
            activeMaskSource = dataUrl;
            if (maskInput) maskInput.value = dataUrl;
            applyMaskSource(dataUrl, { syncSourceInput: true });
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

        const hasOwn = (key) => Object.prototype.hasOwnProperty.call(parsed, key);
        const radius = parsePositiveNumber(parsed.radius) ?? target.r;
        const z = Number.isFinite(Number(parsed.z)) ? Number(parsed.z) : target.z;
        setTarget(target.x, target.y, z, radius);
        const nextOrbitRadius = parsePositiveNumber(parsed.orbitRadius);
        const nextRepelRadius = parsePositiveNumber(parsed.repelRadius);
        if (nextOrbitRadius !== null) orbitRadius = nextOrbitRadius;
        if (nextRepelRadius !== null) repelRadius = nextRepelRadius;

        const nextOrbitReach =
            hasOwn("orbitFieldRadius") || hasOwn("orbitField")
                ? parseNonNegativeNumber(parsed.orbitFieldRadius ?? parsed.orbitField)
                : null;
        const nextRepelReach =
            hasOwn("repelFieldRadius") || hasOwn("repelField")
                ? parseNonNegativeNumber(parsed.repelFieldRadius ?? parsed.repelField)
                : null;

        if (hasOwn("orbitFieldRadius") || hasOwn("orbitField")) {
            orbitFieldRadius = nextOrbitReach !== null && nextOrbitReach > 0 ? nextOrbitReach : null;
        }
        if (hasOwn("repelFieldRadius") || hasOwn("repelField")) {
            repelFieldRadius = nextRepelReach !== null && nextRepelReach > 0 ? nextRepelReach : null;
        }
        let gravityX = hasOwn("gravityX") ? parseNumber(parsed.gravityX) : null;
        let gravityY = hasOwn("gravityY") ? parseNumber(parsed.gravityY) : null;
        let gravityZ = hasOwn("gravityZ") ? parseNumber(parsed.gravityZ) : null;
        if (hasOwn("gravity") && Array.isArray(parsed.gravity)) {
            gravityX = parseNumber(parsed.gravity[0]);
            gravityY = parseNumber(parsed.gravity[1]);
            gravityZ = parseNumber(parsed.gravity[2]);
        } else if (hasOwn("gravity") && parsed.gravity && typeof parsed.gravity === "object") {
            gravityX = parseNumber(parsed.gravity.x);
            gravityY = parseNumber(parsed.gravity.y);
            gravityZ = parseNumber(parsed.gravity.z);
        }
        applyEnvironmentOptions({
            particles: parsePositiveInt(parsed.particles),
            particleRadius: parsePositiveNumber(parsed.radius),
            particleType: typeof parsed.particleType === "string" ? parsed.particleType : null,
            particleColor: parseColorHex(parsed.particleColor),
            drift: parseNumber(parsed.drift),
            driftSpeed: parseNonNegativeNumber(parsed.driftSpeed),
            driftType: parseDriftType(parsed.driftType),
            orbitSpeed: parseNumber(parsed.orbitSpeed),
            orbitPull: parseNumber(parsed.orbitPull),
            repelStrength: parseNumber(parsed.repelStrength),
            orbitReach: nextOrbitReach,
            repelReach: nextRepelReach,
            gravityX,
            gravityY,
            gravityZ,
            friction: hasOwn("friction") ? parseNumber(parsed.friction) : null
        });

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
        if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
            lastPointerPosition = { clientX: event.clientX, clientY: event.clientY };
        }
        if (!orbitOn && !repelOn) return;
        const canvas = world.shadowRoot?.getElementById("renderer");
        const rect = canvas ? canvas.getBoundingClientRect() : world.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = 1 - ((event.clientY - rect.top) / rect.height) * 2;
        if (nx < -1 || nx > 1 || ny < -1 || ny > 1) return;

        let x = Math.max(-1, Math.min(1, nx));
        let y = Math.max(-1, Math.min(1, ny));
        const particleViewer = viewer();
        const projection = particleViewer?.particles?.projection;
        if (projection && typeof projection.getBoundsAtDepth === "function") {
            try {
                const bounds = projection.getBoundsAtDepth(Number(target.z));
                if (bounds) {
                    const left = Number(bounds.left);
                    const right = Number(bounds.right);
                    const top = Number(bounds.top);
                    const bottom = Number(bounds.bottom);
                    if ([left, right, top, bottom].every(Number.isFinite)) {
                        const tx = (x + 1) * 0.5;
                        const ty = (y + 1) * 0.5;
                        x = left + (right - left) * tx;
                        y = bottom + (top - bottom) * ty;
                    }
                }
            } catch (_error) {
                // Keep normalized fallback target when projection bounds are unavailable.
            }
        }
        setTarget(x, y, target.z, target.r);
    }

    function init() {
        const particleViewer = viewer();
        if (!particleViewer) return;
        setupEnvironmentControls();
        applyEnvironmentOptions(buildEnvironmentFromInputs());
        const internalControls = world.shadowRoot?.getElementById("controls");
        if (internalControls) internalControls.style.display = "none";
        syncModeFromToggleInputs();
        setTarget(target.x, target.y, target.z, target.r);
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

    window.addEventListener("pointermove", (event) => {
        targetFromPointer(event);
    });

    world.addEventListener("ready", init, { once: true });
    if (world.ready) init();
}
