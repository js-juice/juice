import "../../components/body.mjs";

const stage = document.getElementById("stage");
const body = document.getElementById("body");
const xEl = document.getElementById("x");
const yEl = document.getElementById("y");
const rEl = document.getElementById("r");

body.width = 180;
body.height = 110;

let last = performance.now();
let t = 0;

/**
 * Executes tick.
 * @param {*} now - Parameter value.
 * @returns {*} Result of tick.
 */
function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;

    const bounds = stage.getBoundingClientRect();
    const cx = bounds.width * 0.5;
    const cy = bounds.height * 0.5;

    body.position.x = cx + Math.cos(t * 1.25) * 120;
    body.position.y = cy + Math.sin(t * 1.75) * 70;
    body.rotation.x = (t * 85) % 360;
    body.render(now);

    xEl.textContent = body.position.x.toFixed(1);
    yEl.textContent = body.position.y.toFixed(1);
    rEl.textContent = body.rotation.x.toFixed(1);
    requestAnimationFrame(tick);
}

body.addEventListener(
    "ready",
    () => {
        body.render(0);
        requestAnimationFrame(tick);
    },
    { once: true }
);
