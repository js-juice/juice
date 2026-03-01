const stage = document.getElementById("stage");
const viewer = document.getElementById("viewer");
const autoSizeButton = document.getElementById("stage-autosize");
const resetButton = document.getElementById("stage-reset-attrs");
const readout = document.getElementById("stage-attr-readout");
let attrObserver = null;

if (!stage || !viewer || !readout) {
    console.warn("[playground:viewer-stage.after] Missing required DOM nodes for stage attribute controls.");
} else {

const ATTRIBUTES = ["width", "height", "x", "y", "fps", "gravity", "friction", "anchor", "state"];
const DEFAULTS = {
    x: 0,
    y: 0,
    fps: 60,
    gravity: 9.81,
    friction: 0.6,
    anchor: "center center",
    state: "initial"
};

const inputMap = new Map();
for (const input of document.querySelectorAll("[data-attr]")) {
    inputMap.set(input.dataset.attr, input);
}

function fmt(value, digits = 2) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(digits) : "n/a";
}

function vec2(label, value, digits = 2) {
    return `${label}: (${fmt(value?.x, digits)}, ${fmt(value?.y, digits)})`;
}

function readStageValue(attr) {
    const attrValue = stage.getAttribute(attr);
    if (attrValue !== null) return attrValue;
    const propValue = stage[attr];
    if (propValue === undefined || propValue === null) return "";
    return String(propValue);
}

function syncInputsFromStage() {
    for (const attr of ATTRIBUTES) {
        const input = inputMap.get(attr);
        if (!input) continue;
        const value = readStageValue(attr);
        if (input.tagName === "SELECT") {
            if (value && Array.from(input.options).some((option) => option.value === value)) {
                input.value = value;
            }
            continue;
        }
        input.value = value;
    }
}

function syncViewerBounds() {
    if (typeof stage._syncBounds === "function") stage._syncBounds();
    if (typeof stage._syncCameraBounds === "function") stage._syncCameraBounds();
    if (typeof stage._refreshPlacement === "function") stage._refreshPlacement();
}

function updateAutoSizeUI() {
    const enabled = stage.autoSize !== false;
    autoSizeButton.textContent = `Auto Size: ${enabled ? "On" : "Off"}`;
    const widthInput = inputMap.get("width");
    const heightInput = inputMap.get("height");
    if (widthInput) widthInput.disabled = enabled;
    if (heightInput) heightInput.disabled = enabled;
}

function setStageAttribute(attr, value) {
    const text = `${value ?? ""}`.trim();
    if (text.length === 0) {
        stage.removeAttribute(attr);
    } else {
        stage.setAttribute(attr, text);
    }

    if (attr === "width" || attr === "height") {
        stage.autoSize = false;
        stage.worldWidth = Number(stage.width) || stage.worldWidth;
        stage.worldHeight = Number(stage.height) || stage.worldHeight;
        syncViewerBounds();
        updateAutoSizeUI();
    }

    if (attr === "fps" && viewer?.timeline) {
        const fps = Number(text);
        if (Number.isFinite(fps) && fps > 0) {
            viewer.timeline.fps = fps;
        }
    }
}

function renderReadout() {
    const camera = viewer?.camera;
    const body = stage?.exampleProbeBody || viewer?.exampleProbeBody;
    const probePosition = body?.position || null;
    const stageTransform = stage?.style?.transform || "none";

    const lines = [];
    lines.push(`timeline owner: ${stage.viewer ? "viewer.timeline" : "stage.timeline"}`);
    lines.push(`viewer linked: ${Boolean(stage.viewer)} (viewer.stage===stage: ${viewer?.stage === stage})`);
    lines.push(`autoSize: ${stage.autoSize !== false}`);
    for (const attr of ATTRIBUTES) {
        const value = stage.getAttribute(attr);
        lines.push(`${attr}: ${value === null ? "(unset)" : value}`);
    }
    lines.push("");
    lines.push(`viewer size: ${fmt(viewer?.width, 0)} x ${fmt(viewer?.height, 0)}`);
    lines.push(vec2("stage.anchorPoint", stage?.anchorPoint));
    lines.push(vec2("stage.position", stage?.position));
    lines.push(vec2("stage.bounds.min", stage?.bounds?.min));
    lines.push(vec2("stage.bounds.max", stage?.bounds?.max));
    lines.push(vec2("camera.position", { x: camera?.x, y: camera?.y }));
    lines.push(vec2("camera.min", camera?.min));
    lines.push(vec2("camera.max", camera?.max));
    lines.push(vec2("probe.world", probePosition));
    lines.push(`stage.transform: ${stageTransform}`);
    readout.textContent = lines.join("\n");
}

function bindInputs() {
    for (const attr of ATTRIBUTES) {
        const input = inputMap.get(attr);
        if (!input) continue;
        const handler = () => setStageAttribute(attr, input.value);
        input.addEventListener("input", handler);
        input.addEventListener("change", handler);
    }
}

function applyDefaults() {
    for (const attr of ATTRIBUTES) {
        if (attr === "width" || attr === "height") continue;
        setStageAttribute(attr, DEFAULTS[attr]);
    }
}

function init() {
    bindInputs();
    syncInputsFromStage();
    updateAutoSizeUI();
    renderReadout();
    requestAnimationFrame(() => {
        syncInputsFromStage();
        updateAutoSizeUI();
        renderReadout();
    });

    attrObserver = new MutationObserver(() => {
        syncInputsFromStage();
        updateAutoSizeUI();
    });
    attrObserver.observe(stage, {
        attributes: true
    });

    requestAnimationFrame(function loop() {
        renderReadout();
        requestAnimationFrame(loop);
    });
}

autoSizeButton?.addEventListener("click", () => {
    stage.autoSize = !stage.autoSize;
    if (stage.autoSize && typeof stage._fitScene === "function") {
        stage._fitScene();
    }
    updateAutoSizeUI();
    syncInputsFromStage();
});

resetButton?.addEventListener("click", () => {
    stage.autoSize = true;
    for (const attr of ATTRIBUTES) {
        stage.removeAttribute(attr);
    }
    applyDefaults();
    if (typeof stage._fitScene === "function") {
        stage._fitScene();
    }
    updateAutoSizeUI();
    syncInputsFromStage();
    renderReadout();
});

if (stage?.ready) {
    init();
} else {
    stage?.addEventListener("ready", init, { once: true });
}
}
