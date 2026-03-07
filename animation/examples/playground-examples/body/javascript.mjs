/**
 * @file examples/playground-examples/body/javascript.mjs
 * @description Animation module.
 */
import "../../../components/body.mjs";
import "../../../components/stage.mjs";
import "../../../components/timeline-controls.mjs";

const stage = document.getElementById("stage");
const body = document.getElementById("body");

if (!stage || !body) {
    console.warn("[playground:body] Missing required DOM nodes for body runtime.");
} else {
    body.width = 180;
    body.height = 110;
    let bound = false;

    const motionAnimator = {
        animate: true,
        update(time) {
            if (!body.ready) return;
            const seconds = Number(time?.seconds) || 0;
            const dims = stage.dimentions || stage.getBoundingClientRect();
            const width = Number(dims?.width) || 0;
            const height = Number(dims?.height) || 0;
            const cx = width * 0.5;
            const cy = height * 0.5;

            body.position.x = cx + Math.cos(seconds * 1.25) * 120;
            body.position.y = cy + Math.sin(seconds * 1.75) * 70;
            body.rotation.x = (seconds * 85) % 360;
        },
        render(time) {
            if (!body.ready) return;
            body.render(time);
        }
    };

    function bindRuntime() {
        if (bound || typeof stage.addAnimator !== "function") return false;
        stage.addAnimator(motionAnimator);
        stage.timeline?.play();
        bound = true;
        return true;
    }

    stage.addEventListener("ready", bindRuntime, { once: true });
}
