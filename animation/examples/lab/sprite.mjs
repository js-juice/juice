import "../../components/sprite.mjs";
import "../rocket-sprite.mjs";

const FRAME_COUNT = 30;

const base = document.getElementById("base");
const baseFrameEl = document.getElementById("base-frame");
const rocket = document.getElementById("rocket");
const rocketYawEl = document.getElementById("rocket-yaw");
const rocketFrameEl = document.getElementById("rocket-frame");
const speedInput = document.getElementById("speed");

let baseReady = false;
let basePlaying = false;
let baseFrame = 0;
let baseLast = performance.now();

let rocketReady = false;
let rocketPlaying = false;
let rocketDirection = 1;
let rocketLast = performance.now();

function render() {
    baseFrameEl.textContent = String(baseFrame);
    rocketYawEl.textContent = Number(rocket.degrees || 0).toFixed(1);
    rocketFrameEl.textContent = String(rocket.frame || 0);
}

function tick(now) {
    if (baseReady && basePlaying && now - baseLast >= 1000 / 12) {
        baseLast = now;
        baseFrame = (baseFrame + 1) % FRAME_COUNT;
        base.frame = baseFrame;
    }

    if (rocketReady && rocketPlaying && now - rocketLast >= 12) {
        rocketLast = now;
        const speed = Number(speedInput.value) || 1;
        rocket.addDegrees(rocketDirection * speed);
        if (rocket.degrees >= 60 || rocket.degrees <= -60) {
            rocketDirection *= -1;
        }
    }

    render();
    requestAnimationFrame(tick);
}

base.addEventListener(
    "ready",
    () => {
        baseReady = true;
        base.frame = 0;
    },
    { once: true }
);

rocket.addEventListener(
    "sheet-ready",
    () => {
        rocketReady = true;
        rocket.setFrameByDegree(0);
    },
    { once: true }
);

document.getElementById("base-play").addEventListener("click", () => {
    if (!baseReady) return;
    basePlaying = true;
    baseLast = performance.now();
});

document.getElementById("base-pause").addEventListener("click", () => {
    basePlaying = false;
});

document.getElementById("base-step").addEventListener("click", () => {
    if (!baseReady) return;
    baseFrame = (baseFrame + 1) % FRAME_COUNT;
    base.frame = baseFrame;
});

document.getElementById("rocket-play").addEventListener("click", () => {
    if (!rocketReady) return;
    rocketPlaying = true;
    rocketLast = performance.now();
});

document.getElementById("rocket-pause").addEventListener("click", () => {
    rocketPlaying = false;
});

document.getElementById("rocket-left").addEventListener("click", () => {
    if (!rocketReady) return;
    rocket.addDegrees(-5);
    render();
});

document.getElementById("rocket-right").addEventListener("click", () => {
    if (!rocketReady) return;
    rocket.addDegrees(5);
    render();
});

requestAnimationFrame(tick);
