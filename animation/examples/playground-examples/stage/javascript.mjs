import "../../../components/stage.mjs";
import "../../../components/timeline-controls.mjs";

const stage = document.getElementById("stage");
const probe = document.getElementById("probe");

if (!stage || !probe) {
    console.warn("[playground:stage] Missing required DOM nodes for stage example runtime.");
} else {
    let bound = false;

    const state = {
        x: 0,
        y: 0,
        rate: 2.25
    };

    function sampleProbeAt(seconds = 0) {
        const time = Number(seconds) || 0;
        state.x = Math.sin(time * state.rate * 1.1) * 120;
        state.y = Math.sin(time * state.rate * 1.6) * 70;
    }

    const probeAnimator = {
        animate: true,
        update(time) {
            sampleProbeAt(time?.seconds);
        },
        render() {
            probe.style.transform = `translate3d(${state.x}px, ${state.y}px, 0)`;
        }
    };

    function bindStage() {
        if (bound) return;
        sampleProbeAt(0);
        probeAnimator.render();
        stage.addAnimator(probeAnimator);
        bound = true;
    }

    stage.addEventListener("ready", bindStage, { once: true });
    if (stage.ready) bindStage();

    stage.exampleState = state;
    stage.exampleScene = {
        sampleAt: sampleProbeAt,
        render() {
            probeAnimator.render();
        }
    };
}
