import "../rocket-sprite.mjs";

const rocket = document.getElementById("rocket");
const stateEl = document.getElementById("state");
const yawEl = document.getElementById("yaw");
const frameEl = document.getElementById("frame");
const speedInput = document.getElementById("speed");

let ready = false;
let playing = false;
let direction = 1;
let last = performance.now();

/**
 * Renders module output using the current state.
 * @returns {*} Result of renderReadout.
 */
function renderReadout() {
    yawEl.textContent = Number(rocket.degrees || 0).toFixed(1);
    frameEl.textContent = String(rocket.frame || 0);
}

/**
 * Executes tick.
 * @param {*} now - Parameter value.
 * @returns {*} Result of tick.
 */
function tick(now) {
    if (ready && playing && now - last >= 12) {
        last = now;
        const speed = Number(speedInput.value) || 1;
        rocket.addDegrees(direction * speed);
        if (rocket.degrees >= 60 || rocket.degrees <= -60) {
            direction *= -1;
        }
        renderReadout();
    }

    requestAnimationFrame(tick);
}

rocket.addEventListener(
    "sheet-ready",
    () => {
        ready = true;
        rocket.setFrameByDegree(0);
        stateEl.textContent = "ready";
        renderReadout();
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

document.getElementById("left").addEventListener("click", () => {
    if (!ready) return;
    rocket.addDegrees(-5);
    stateEl.textContent = "manual";
    renderReadout();
});

document.getElementById("right").addEventListener("click", () => {
    if (!ready) return;
    rocket.addDegrees(5);
    stateEl.textContent = "manual";
    renderReadout();
});

document.getElementById("reset").addEventListener("click", () => {
    if (!ready) return;
    playing = false;
    direction = 1;
    rocket.setFrameByDegree(0);
    stateEl.textContent = "reset";
    renderReadout();
});

requestAnimationFrame(tick);
