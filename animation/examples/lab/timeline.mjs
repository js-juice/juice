/**
 * @file examples/lab/timeline.mjs
 * @description Animation module.
 */
import { Timeline } from "../../index.mjs";

const CYCLE_MS = 4000;

const bar = document.getElementById("bar");
const cycleEl = document.getElementById("cycle");
const fpsEl = document.getElementById("fps");
const frameEl = document.getElementById("frame");
const stateEl = document.getElementById("state");

const timeline = new Timeline(null, { defer: true, fps: 60 });
let baseSpeed = 1;

const applyScale = () => {
    const sign = timeline.reverse ? -1 : 1;
    timeline.setTimeScale(sign * baseSpeed);
};

const resetReadout = () => {
    bar.style.width = "0%";
    cycleEl.textContent = "0.00";
    fpsEl.textContent = "0";
    frameEl.textContent = "0";
};

timeline.update = (time) => {
    const cycleMs = time.ms % CYCLE_MS;
    const ratio = Math.max(0, Math.min(1, cycleMs / CYCLE_MS));
    bar.style.width = `${(ratio * 100).toFixed(2)}%`;
    cycleEl.textContent = (cycleMs / 1000).toFixed(2);
    fpsEl.textContent = Number.isFinite(time.fps) ? String(Math.round(time.fps)) : "0";
    frameEl.textContent = String(time.frame);
};

document.getElementById("play").addEventListener("click", () => {
    timeline.play();
    stateEl.textContent = "playing";
});

document.getElementById("pause").addEventListener("click", () => {
    timeline.pause();
    stateEl.textContent = "paused";
});

document.getElementById("reset").addEventListener("click", () => {
    timeline.pause();
    timeline.reset();
    resetReadout();
    stateEl.textContent = "paused";
});

document.getElementById("reverse").addEventListener("click", () => {
    timeline.setReverse(!timeline.reverse);
    applyScale();
});

const speedButtons = Array.from(document.querySelectorAll(".speed"));
for (let i = 0; i < speedButtons.length; i += 1) {
    speedButtons[i].addEventListener("click", () => {
        const speed = parseFloat(speedButtons[i].dataset.speed || "1");
        if (!Number.isFinite(speed) || speed <= 0) return;
        baseSpeed = speed;
        applyScale();
    });
}
resetReadout();
applyScale();
