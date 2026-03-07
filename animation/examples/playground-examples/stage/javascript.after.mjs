/**
 * @file examples/playground-examples/stage/javascript.after.mjs
 * @description Animation module.
 */
const stage = document.getElementById("stage");
const timelineControls = document.getElementById("timeline-controls");
const state = document.getElementById("state");
const owner = document.getElementById("owner");
const px = document.getElementById("px");
const py = document.getElementById("py");
const runtimeStats = document.getElementById("runtime-stats");

if (!stage || !state || !owner || !px || !py || !runtimeStats) {
    console.warn("[playground:stage.after] Missing required DOM nodes for stage readout controls.");
} else {
function ownerLabel() {
    return stage?.viewer ? "viewer timeline" : "stage (local timeline)";
}

function fmt(value, digits = 2) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(digits) : "n/a";
}

function vec2(label, value, digits = 2) {
    return `${label}: (${fmt(value?.x, digits)}, ${fmt(value?.y, digits)})`;
}

function renderRuntimeStats() {
    if (!runtimeStats || !stage) return;
    const stateModel = stage.exampleState;
    const timeline = stage.timeline;
    const lines = [];
    lines.push(`timeline owner: ${ownerLabel()}`);
    lines.push(`timeline state: ${timeline?.paused ? "paused" : "playing"}`);
    lines.push(`timeline time: ${fmt(timeline?.time?.seconds, 3)}s`);
    lines.push(`timeline scale: ${fmt(timeline?.timeScale, 2)}x`);
    lines.push(`stage size: ${fmt(stage.width, 0)} x ${fmt(stage.height, 0)}`);
    lines.push(vec2("stage.anchorPoint", stage.anchorPoint));
    lines.push(vec2("stage.position", stage.position));
    lines.push(vec2("stage.bounds.min", stage.bounds?.min));
    lines.push(vec2("stage.bounds.max", stage.bounds?.max));
    lines.push(`probe local: (${fmt(stateModel?.x, 1)}, ${fmt(stateModel?.y, 1)})`);
    lines.push(`stage transform: ${stage.style.transform || "none"}`);
    runtimeStats.textContent = lines.join("\n");
}

function renderReadout() {
    const stateModel = stage.exampleState;
    state.textContent = stage.timeline?.paused ? "paused" : "playing";
    owner.textContent = ownerLabel();
    px.textContent = Number(stateModel?.x || 0).toFixed(1);
    py.textContent = Number(stateModel?.y || 0).toFixed(1);
    renderRuntimeStats();
}

if (timelineControls && !timelineControls.getAttribute("stage")) {
    timelineControls.setAttribute("stage", "#stage");
}

timelineControls?.addEventListener("timeline-action", () => {
    renderReadout();
});

function readoutLoop() {
    renderReadout();
    requestAnimationFrame(readoutLoop);
}

readoutLoop();
}
