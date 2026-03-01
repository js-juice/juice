import ParticleEmitter from "../../../particles/emitter.mjs";
import Particle from "../../../particles/particle.mjs";

function $(id) {
    return document.getElementById(id);
}

const canvas = $("emitter-canvas");
const ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;

let width = 300;
let height = 300;
function resize() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    canvas.width = width;
    canvas.height = height;
}

window.addEventListener("resize", resize);

// control elements (support both legacy and new IDs)
const emitRateEl = $("emit-rate") || $("emitter-pps");
const emitSpeedEl = $("emit-speed") || $("emitter-speed");
const emitSpreadEl = $("emit-spread") || $("emitter-spread");
const emitSizeEl = $("emit-size") || $("emitter-size");
const emitLifeEl = $("emit-life") || $("emitter-life");
const emitDirEl = $("emit-dir") || $("emitter-direction");
const startBtn = $("start-btn") || $("emitter-toggle");
const stopBtn = $("stop-btn");
const clearBtn = $("clear-btn");
const burstInput = $("emitter-burst") || $("emit-burst");
const burstBtn = $("emitter-burst-btn");
const gravX = $("emitter-grav-x");
const gravY = $("emitter-grav-y");
const gravZ = $("emitter-grav-z");
const frictionInput = $("emitter-friction");
const thetaInput = $("emitter-theta");
const phiInput = $("emitter-phi");
const posXInput = $("emitter-pos-x");
const posYInput = $("emitter-pos-y");
const posZInput = $("emitter-pos-z");

// Initialize emitter
let emitter = new ParticleEmitter({
    x: 150,
    y: 150,
    particlesPerSecond: Number((emitRateEl && emitRateEl.value) || 40),
    direction: Number((emitDirEl && emitDirEl.value) || -90) * (Math.PI / 180),
    speed: Number((emitSpeedEl && emitSpeedEl.value) || 120),
    spread: (Number((emitSpreadEl && emitSpreadEl.value) || 30) * Math.PI) / 180,
    size: Number((emitSizeEl && emitSizeEl.value) || 3),
    lifespan: Number((emitLifeEl && emitLifeEl.value) || 2)
});

let running = true;
let lastTime = performance.now();

function applyControls() {
    if (emitRateEl) emitter.particlesPerSecond = Number(emitRateEl.value) || 10;
    if (emitSpeedEl) emitter.speed = Number(emitSpeedEl.value) || 100;
    if (emitSpreadEl) emitter.spread = (Number(emitSpreadEl.value) || 0) * (Math.PI / 180);
    if (emitSizeEl) emitter.size = Number(emitSizeEl.value) || 2;
    if (emitLifeEl) emitter.lifespan = Number(emitLifeEl.value) || 1;
    if (emitDirEl) emitter.direction = (Number(emitDirEl.value) || 0) * (Math.PI / 180);
    if (posXInput) emitter.x = Number(posXInput.value) || emitter.x;
    if (posYInput) emitter.y = Number(posYInput.value) || emitter.y;
    if (gravX || gravY) {
        const gx = Number(gravX?.value || 0);
        const gy = Number(gravY?.value || 0);
        emitter.forces = [{ x: gx, y: gy }];
        emitter.particles.forEach((p) => (p.forces = emitter.forces));
    }
    if (frictionInput) {
        emitter._friction = Number(frictionInput.value) || 0;
    }
}

// Wire input events
[
    emitRateEl,
    emitSpeedEl,
    emitSpreadEl,
    emitSizeEl,
    emitLifeEl,
    emitDirEl,
    posXInput,
    posYInput,
    gravX,
    gravY,
    frictionInput
].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", applyControls);
});

if (burstBtn && burstInput) {
    burstBtn.addEventListener("click", () => {
        const n = Math.max(0, Math.floor(Number(burstInput.value || 0)));
        for (let i = 0; i < n; i++) {
            const randomDirection = emitter.direction + (Math.random() * emitter.spread - emitter.spread / 2);
            const randomSpeed = emitter.speed + Math.random() * emitter.speed * 0.2 - emitter.speed * 0.1;
            const randomSize = emitter.size + Math.random() * emitter.size * 0.5 - emitter.size * 0.25;
            const randomLifespan = emitter.lifespan + Math.random() * emitter.lifespan * 0.5 - emitter.lifespan * 0.25;
            const velocityX = Math.cos(randomDirection) * randomSpeed;
            const velocityY = Math.sin(randomDirection) * randomSpeed;
            const particle = new Particle(
                emitter.x,
                emitter.y,
                velocityX,
                velocityY,
                randomSize,
                randomLifespan,
                emitter.forces || [],
                false
            );
            emitter.particles.push(particle);
        }
    });
}

startBtn &&
    startBtn.addEventListener("click", () => {
        running = true;
        if (startBtn && startBtn.id === "emitter-toggle") startBtn.textContent = "Emitter: on";
    });
stopBtn &&
    stopBtn.addEventListener("click", () => {
        running = false;
        if (startBtn && startBtn.id === "emitter-toggle") startBtn.textContent = "Emitter: off";
    });
clearBtn &&
    clearBtn.addEventListener("click", () => {
        emitter.particles.length = 0;
    });

function loop(now) {
    const dt = Math.max(0, (now - lastTime) / 1000);
    lastTime = now;
    if (running) {
        emitter.update(dt);
        const f = Number(emitter._friction || 0);
        if (f > 0) {
            const damp = Math.max(0, 1 - f * dt);
            for (let i = 0; i < emitter.particles.length; i++) {
                const p = emitter.particles[i];
                p.velocityX *= damp;
                p.velocityY *= damp;
            }
        }
    }

    if (ctx) {
        // simple trail effect: clear with slight opacity
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "#ffffff";
        emitter.draw(ctx);
    }

    requestAnimationFrame(loop);
}

function init() {
    resize();
    // center emitter
    emitter.x = Math.floor(width / 2);
    emitter.y = Math.floor(height / 2);
    applyControls();
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

window.addEventListener("load", init);
