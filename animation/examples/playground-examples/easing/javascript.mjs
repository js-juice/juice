import Easing from "../../../easing.mjs";
import "../../../components/stage.mjs";
import "../../../components/timeline-controls.mjs";

const DURATION_SECONDS = 2.4;
const CURVE_SAMPLES = 28;

const stage = document.getElementById("stage");
const easingList = document.getElementById("easing-list");

if (!stage || !easingList) {
    console.warn("[playground:easing] Missing required DOM nodes for easing runtime.");
} else {
    const rows = Object.entries(Easing)
        .filter((entry) => typeof entry[1] === "function")
        .map(([name, fn]) => createRow(name, fn));

    let phase = 0;

    const easingAnimator = {
        animate: true,
        update(time) {
            const seconds = Number(time?.seconds) || 0;
            phase = ((seconds % DURATION_SECONDS) + DURATION_SECONDS) % DURATION_SECONDS;
        },
        render() {
            const t = phase / DURATION_SECONDS;
            for (let i = 0; i < rows.length; i += 1) {
                const row = rows[i];
                const raw = Number(row.fn(t));
                const eased = Math.max(0, Math.min(1, Number.isFinite(raw) ? raw : 0));
                const maxX = Math.max(0, row.track.clientWidth - row.dot.offsetWidth - 2);
                row.dot.style.transform = `translateX(${(maxX * eased).toFixed(2)}px)`;
                row.value.textContent = eased.toFixed(3);
            }
        }
    };

    stage.exampleState = {
        get phase() {
            return phase / DURATION_SECONDS;
        }
    };

    function bind() {
        stage.addAnimator(easingAnimator);
        stage.timeline.play();
    }

    stage.addEventListener("ready", bind, { once: true });
    if (stage.ready) bind();
}

function createRow(name, fn) {
    const row = document.createElement("div");
    row.className = "easing-row";

    const label = document.createElement("div");
    label.className = "easing-name";
    label.textContent = name;

    const curve = buildCurve(fn);

    const track = document.createElement("div");
    track.className = "easing-track";

    const dot = document.createElement("div");
    dot.className = "easing-dot";
    track.appendChild(dot);

    const value = document.createElement("div");
    value.className = "easing-value";
    value.textContent = "0.000";

    row.append(label, curve, track, value);
    easingList.appendChild(row);

    return { fn, track, dot, value };
}

function buildCurve(fn) {
    const svgNS = "http://www.w3.org/2000/svg";
    const width = 120;
    const height = 44;
    const pad = 4;

    const svg = document.createElementNS(svgNS, "svg");
    svg.classList.add("easing-curve");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const axis = document.createElementNS(svgNS, "path");
    axis.setAttribute("d", `M ${pad} ${height - pad} L ${width - pad} ${height - pad} M ${pad} ${height - pad} L ${pad} ${pad}`);
    axis.setAttribute("stroke", "#b8c9e6");
    axis.setAttribute("stroke-width", "1");
    axis.setAttribute("fill", "none");
    svg.appendChild(axis);

    let path = "";
    for (let i = 0; i <= CURVE_SAMPLES; i += 1) {
        const t = i / CURVE_SAMPLES;
        const raw = Number(fn(t));
        const yValue = Math.max(0, Math.min(1, Number.isFinite(raw) ? raw : 0));
        const x = pad + t * (width - pad * 2);
        const y = height - pad - yValue * (height - pad * 2);
        path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }

    const line = document.createElementNS(svgNS, "path");
    line.setAttribute("d", path);
    line.setAttribute("stroke", "#2f7cff");
    line.setAttribute("stroke-width", "2");
    line.setAttribute("fill", "none");
    svg.appendChild(line);

    return svg;
}
