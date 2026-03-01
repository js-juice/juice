import "../../../components/stage.mjs";
import "../../../components/sprite.mjs";
import "../../../components/timeline-controls.mjs";

const stage = document.getElementById("stage");
const sprite = document.getElementById("base");
const controls = document.getElementById("timeline-controls");

if (!stage || !sprite) {
    console.warn("[playground:sprite-base] Missing required DOM nodes for sprite-base runtime.");
} else {
    let bound = false;

    function bindSpriteToStage() {
        const canBind =
            typeof stage.addAnimator === "function" &&
            (sprite.animate === true || typeof sprite.update === "function" || typeof sprite.render === "function");
        if (!canBind) return false;

        if (!bound) {
            stage.addAnimator(sprite);
            bound = true;
        }

        if (controls) {
            if (!controls.getAttribute("stage")) controls.setAttribute("stage", "#stage");
            if (!controls.getAttribute("timeline")) controls.setAttribute("timeline", "#stage");
        }

        sprite.auto = true;
        sprite.loop = true;
        sprite.paused = false;

        if (stage.timeline?.play) stage.timeline.play();
        return true;
    }

    function ensureBound() {
        if (bindSpriteToStage()) return;
        requestAnimationFrame(ensureBound);
    }

    Promise.all([customElements.whenDefined("animation-stage"), customElements.whenDefined("animation-sprite")]).then(
        () => {
            ensureBound();
            stage.addEventListener("ready", bindSpriteToStage, { once: true });
            sprite.addEventListener("ready", bindSpriteToStage, { once: true });
        }
    );
}
