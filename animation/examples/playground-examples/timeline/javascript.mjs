/**
 * @file examples/playground-examples/timeline/javascript.mjs
 * @description Animation module.
 */
import "../../../components/stage.mjs";
import "../../../components/timeline-controls.mjs";

const CYCLE_MS = 4000;

const stage = document.getElementById("stage");
const controls = document.getElementById("timeline-controls");
const bar = document.getElementById("bar");
const cycleEl = document.getElementById("cycle");
const fpsEl = document.getElementById("fps");
const frameEl = document.getElementById("frame");
const stateEl = document.getElementById("state");

if (!stage || !bar || !cycleEl || !fpsEl || !frameEl || !stateEl) {
    console.warn("[playground:timeline] Missing required DOM nodes for timeline runtime.");
} else {
    let bound = false;

    function resetReadout() {
        bar.style.width = "0%";
        cycleEl.textContent = "0.00";
        fpsEl.textContent = "0";
        frameEl.textContent = "0";
    }

    const timelineAnimator = {
        animate: true,
        update(time) {
            const ms = Number(time?.ms) || 0;
            const cycleMs = ((ms % CYCLE_MS) + CYCLE_MS) % CYCLE_MS;
            const ratio = Math.max(0, Math.min(1, cycleMs / CYCLE_MS));
            bar.style.width = `${(ratio * 100).toFixed(2)}%`;
            cycleEl.textContent = (cycleMs / 1000).toFixed(2);
            fpsEl.textContent = Number.isFinite(time?.fps) ? String(Math.round(time.fps)) : "0";
            frameEl.textContent = String(time?.frame || 0);
            stateEl.textContent = stage.timeline?.paused ? "paused" : "playing";
        },
        render() {}
    };

    function bindRuntime() {
        if (bound || typeof stage.addAnimator !== "function") return false;
        stage.addAnimator(timelineAnimator);
        stage.timeline?.play();
        bound = true;
        return true;
    }

    controls?.addEventListener("timeline-action", (event) => {
        if (event?.detail?.action === "reset") {
            resetReadout();
        }
        stateEl.textContent = stage.timeline?.paused ? "paused" : "playing";
    });

    stage.addEventListener("ready", bindRuntime, { once: true });

    resetReadout();
}
