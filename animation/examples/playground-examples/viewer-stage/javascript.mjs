import "../../../components/minimap.mjs";
import "../../../components/timeline-controls.mjs";
import AnimationBody from "../../../body-target.mjs";

const stage = document.getElementById("stage");
const viewer = document.getElementById("viewer");
const probe = document.getElementById("probe");

/**
 * Executes initFollowDemo.
 * @returns {*} Result of initFollowDemo.
 */
function initFollowDemo() {
    if (!stage || !probe || stage._probeFollowBound) return;
    stage._probeFollowBound = true;

    // User-facing speed knob for probe movement.
    stage.speed = Number(stage.speed) || 0.6;

    const motion = {
        phase: 0,
        worldX: 0,
        worldY: 0
    };
    const body = new AnimationBody(probe, {
        anchor: "center center",
        worldSpace: true,
        clampToStage: true,
        update(time, target) {
            const dt = Math.max(0, Number(time?.delta || 1 / 60));
            const speed = Number(stage.speed) || 0.6;
            const width = Math.max(1, Number(stage.width) || 1);
            const height = Math.max(1, Number(stage.height) || 1);
            const halfProbeW = Math.max(1, Number(probe.offsetWidth) || 56) * 0.5;
            const halfProbeH = Math.max(1, Number(probe.offsetHeight) || 56) * 0.5;

            motion.phase += dt * speed;

            // Centered figure-8 (Lissajous) that stays away from scene edges.
            const ampX = Math.max(80, width * 0.16);
            const ampY = Math.max(55, height * 0.12);
            motion.worldX = width * 0.5 + Math.sin(motion.phase * 1.0) * ampX;
            motion.worldY = height * 0.5 + Math.sin(motion.phase * 2.0) * ampY;

            const clampedX = Math.max(halfProbeW, Math.min(width - halfProbeW, motion.worldX));
            const clampedY = Math.max(halfProbeH, Math.min(height - halfProbeH, motion.worldY));
            target.setPosition(clampedX, clampedY);
        }
    });

    stage.addAnimator(body);
    stage.exampleProbeBody = body;
    stage.exampleMotion = motion;
    viewer.exampleProbeBody = body;

    if (viewer?.timeline?.play) {
        viewer.timeline.play();
    }
    if (viewer?.follow) {
        viewer.follow(body);
    }
}

if (stage?.ready) {
    initFollowDemo();
} else if (stage) {
    stage.addEventListener("ready", initFollowDemo, { once: true });
}
