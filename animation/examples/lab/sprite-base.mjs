import "../../components/sprite.mjs";

const FRAME_COUNT = 30;
const FRAME_MS = 1000 / 12;

const sprite = document.getElementById("base");
const stateEl = document.getElementById("state");
const frameEl = document.getElementById("frame");

let ready = false;
let playing = false;
let frame = 0;
let last = performance.now();

function renderReadout() {
    frameEl.textContent = String(frame);
}

function applyFrame(nextFrame) {
    frame = ((nextFrame % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT;
    sprite.frame = frame;
    renderReadout();
}

function tick(now) {
    if (ready && playing && now - last >= FRAME_MS) {
        last = now;
        applyFrame(frame + 1);
    }
    requestAnimationFrame(tick);
}

sprite.addEventListener(
    "ready",
    () => {
        ready = true;
        stateEl.textContent = "ready";
        applyFrame(0);
    },
    { once: true }
);

document.getElementById("play").addEventListener("click", () => {
    if (!ready) return;
    playing = true;
    last = performance.now();
    stateEl.textContent = "playing";
});

document.getElementById("pause").addEventListener("click", () => {
    playing = false;
    stateEl.textContent = "paused";
});

document.getElementById("step").addEventListener("click", () => {
    if (!ready) return;
    applyFrame(frame + 1);
    stateEl.textContent = "manual";
});

document.getElementById("reset").addEventListener("click", () => {
    if (!ready) return;
    playing = false;
    applyFrame(0);
    stateEl.textContent = "reset";
});

requestAnimationFrame(tick);
