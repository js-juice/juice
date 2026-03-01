import "../../../components/stage.mjs";
import "../../../components/timeline-controls.mjs";

const DURATION_SECONDS = 2.4;
const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 260;
const PAD_X = 20;
const PAD_Y = 18;
const PLOT_WIDTH = VIEWBOX_WIDTH - PAD_X * 2;
const PLOT_HEIGHT = VIEWBOX_HEIGHT - PAD_Y * 2;
const HANDLE_MIN_GAP = 0.01;

const stage = document.getElementById("stage");
const editor = document.getElementById("bezier-editor");
const codeEl = document.getElementById("custom-code");
const cssInput = document.getElementById("custom-css");
const copyButton = document.getElementById("copy-css");
const linearDot = document.getElementById("linear-dot");
const customDot = document.getElementById("custom-dot");
const linearValue = document.getElementById("linear-value");
const customValue = document.getElementById("custom-value");

if (!stage || !editor || !codeEl || !cssInput || !copyButton || !linearDot || !customDot || !linearValue || !customValue) {
    console.warn("[playground:custom-easing] Missing required DOM nodes for custom easing runtime.");
} else {
    const points = [
        { id: "start", x: 0, y: 0, fixed: true },
        { id: "p1", x: 0.25, y: 0.1, fixed: false },
        { id: "p2", x: 0.25, y: 1, fixed: false },
        { id: "end", x: 1, y: 1, fixed: true }
    ];

    const tangentById = {};
    seedTangents(points, tangentById);

    let activeKind = "";
    let activeId = "";
    let nextId = 3;
    let phase = 0;

    const svg = buildEditorSvg(editor);

    const animator = {
        animate: true,
        update(time) {
            const seconds = Number(time?.seconds) || 0;
            phase = ((seconds % DURATION_SECONDS) + DURATION_SECONDS) % DURATION_SECONDS;
        },
        render() {
            const t = phase / DURATION_SECONDS;
            const linear = t;
            const custom = clamp01(sampleCustomEase(points, tangentById, t));
            moveDot(linearDot, linear);
            moveDot(customDot, custom);
            linearValue.textContent = linear.toFixed(3);
            customValue.textContent = custom.toFixed(3);
        }
    };

    function renderEditor() {
        syncEditorSvg(svg, points, tangentById);
        codeEl.textContent = `smooth points(${points.map((point) => `(${point.x.toFixed(2)},${point.y.toFixed(2)})`).join(" -> ")})`;
        cssInput.value = buildCssLinearFunction(points, tangentById);
    }

    function bind() {
        stage.addAnimator(animator);
        stage.timeline.play();
        renderEditor();
    }

    stage.exampleState = {
        get phase() {
            return phase / DURATION_SECONDS;
        },
        get points() {
            return points.map((point) => ({ x: point.x, y: point.y, slope: tangentById[point.id] || 0 }));
        }
    };

    copyButton.addEventListener("click", async () => {
        const text = cssInput.value || "";
        let copied = false;
        try {
            if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
                await navigator.clipboard.writeText(text);
                copied = true;
            }
        } catch (_error) {
            copied = false;
        }

        if (!copied) {
            cssInput.focus();
            cssInput.select();
            copied = document.execCommand("copy");
        }

        const previous = copyButton.textContent;
        copyButton.textContent = copied ? "Copied" : "Copy Failed";
        setTimeout(() => {
            copyButton.textContent = previous;
        }, 900);
    });

    editor.addEventListener("pointerdown", (event) => {
        const kind = event.target?.dataset?.handleKind;
        const id = event.target?.dataset?.handleId;

        if (kind === "anchor" && id) {
            const point = points.find((entry) => entry.id === id);
            if (!point || point.fixed) return;
            activeKind = "anchor";
            activeId = id;
            if (typeof editor.setPointerCapture === "function") {
                editor.setPointerCapture(event.pointerId);
            }
            event.preventDefault();
            return;
        }

        if (kind === "tangent" && id) {
            activeKind = "tangent";
            activeId = id;
            if (typeof editor.setPointerCapture === "function") {
                editor.setPointerCapture(event.pointerId);
            }
            event.preventDefault();
            return;
        }

        const pointer = pointerToPoint(event, editor);
        const insertIndex = findInsertIndex(points, pointer.x);
        if (insertIndex <= 0 || insertIndex >= points.length) return;

        const left = points[insertIndex - 1];
        const right = points[insertIndex];
        const nextPoint = {
            id: `p${nextId++}`,
            x: clamp(pointer.x, left.x + HANDLE_MIN_GAP, right.x - HANDLE_MIN_GAP),
            y: pointer.y,
            fixed: false
        };
        if (nextPoint.x <= left.x || nextPoint.x >= right.x) return;

        points.splice(insertIndex, 0, nextPoint);
        const leftSlope = Number(tangentById[left.id]) || 0;
        const rightSlope = Number(tangentById[right.id]) || 0;
        tangentById[nextPoint.id] = (leftSlope + rightSlope) * 0.5;

        activeKind = "anchor";
        activeId = nextPoint.id;
        renderEditor();

        if (typeof editor.setPointerCapture === "function") {
            editor.setPointerCapture(event.pointerId);
        }
        event.preventDefault();
    });

    editor.addEventListener("pointermove", (event) => {
        if (!activeKind || !activeId) return;
        const index = points.findIndex((entry) => entry.id === activeId);
        if (index < 0) return;

        const pointer = pointerToPoint(event, editor);
        const point = points[index];

        if (activeKind === "anchor") {
            if (point.fixed) return;
            const left = points[index - 1];
            const right = points[index + 1];
            point.x = clamp(pointer.x, left.x + HANDLE_MIN_GAP, right.x - HANDLE_MIN_GAP);
            point.y = pointer.y;
        } else if (activeKind === "tangent") {
            const dir = tangentDirection(point);
            let x = pointer.x;
            if (dir > 0) {
                x = Math.max(point.x + 0.005, x);
            } else {
                x = Math.min(point.x - 0.005, x);
            }
            x = clamp01(x);
            const dx = x - point.x;
            if (Math.abs(dx) < 1e-5) return;
            const slope = clamp((pointer.y - point.y) / dx, -12, 12);
            tangentById[point.id] = slope;
        }

        renderEditor();
    });

    function clearActive() {
        activeKind = "";
        activeId = "";
    }

    editor.addEventListener("pointerup", clearActive);
    editor.addEventListener("pointercancel", clearActive);
    editor.addEventListener("lostpointercapture", clearActive);

    stage.addEventListener("ready", bind, { once: true });
    if (stage.ready) bind();
}

function moveDot(dot, value) {
    const maxX = Math.max(0, dot.parentElement.clientWidth - dot.offsetWidth - 2);
    dot.style.transform = `translateX(${(maxX * value).toFixed(2)}px)`;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function clamp01(value) {
    return clamp(value, 0, 1);
}

function findInsertIndex(points, x) {
    for (let i = 1; i < points.length; i += 1) {
        if (x < points[i].x) return i;
    }
    return -1;
}

function pointerToPoint(event, svg) {
    const rect = svg.getBoundingClientRect();
    const xPx = ((event.clientX - rect.left) / rect.width) * VIEWBOX_WIDTH;
    const yPx = ((event.clientY - rect.top) / rect.height) * VIEWBOX_HEIGHT;
    const x = clamp01((xPx - PAD_X) / PLOT_WIDTH);
    const y = clamp01(1 - (yPx - PAD_Y) / PLOT_HEIGHT);
    return { x, y };
}

function toSvgPoint(point) {
    return {
        x: PAD_X + point.x * PLOT_WIDTH,
        y: PAD_Y + (1 - point.y) * PLOT_HEIGHT
    };
}

function createSvgElement(tag, attrs = {}) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    return el;
}

function tangentDirection(point) {
    return point.id === "end" ? -1 : 1;
}

function tangentHandlePoint(point, slope) {
    const dir = tangentDirection(point);
    const available = dir > 0 ? 1 - point.x : point.x;
    const dx = Math.max(0.03, Math.min(0.12, available * 0.45));
    const signedDx = dir * dx;
    const x = clamp01(point.x + signedDx);
    const y = clamp01(point.y + slope * signedDx);
    return { x, y };
}

function buildEditorSvg(svg) {
    svg.innerHTML = "";

    const gridLayer = createSvgElement("g");
    for (let i = 0; i <= 4; i += 1) {
        const x = PAD_X + (PLOT_WIDTH * i) / 4;
        const y = PAD_Y + (PLOT_HEIGHT * i) / 4;
        gridLayer.appendChild(
            createSvgElement("line", { x1: x, y1: PAD_Y, x2: x, y2: PAD_Y + PLOT_HEIGHT, class: "editor-grid" })
        );
        gridLayer.appendChild(
            createSvgElement("line", { x1: PAD_X, y1: y, x2: PAD_X + PLOT_WIDTH, y2: y, class: "editor-grid" })
        );
    }
    svg.appendChild(gridLayer);

    const linear = createSvgElement("line", {
        x1: PAD_X,
        y1: PAD_Y + PLOT_HEIGHT,
        x2: PAD_X + PLOT_WIDTH,
        y2: PAD_Y,
        class: "editor-linear"
    });
    svg.appendChild(linear);

    const pathLayer = createSvgElement("g");
    const handleLayer = createSvgElement("g");

    const controlPath = createSvgElement("path", { class: "editor-line" });
    const curve = createSvgElement("path", { class: "editor-curve" });
    pathLayer.append(controlPath, curve);

    svg.append(pathLayer, handleLayer);
    return { controlPath, curve, handleLayer };
}

function syncEditorSvg(svgState, points, tangentById) {
    const controlPath = points
        .map((point, index) => {
            const pos = toSvgPoint(point);
            return `${index === 0 ? "M" : "L"} ${pos.x} ${pos.y}`;
        })
        .join(" ");
    svgState.controlPath.setAttribute("d", controlPath);

    let smoothPath = "";
    const samples = 160;
    for (let i = 0; i <= samples; i += 1) {
        const t = i / samples;
        const y = clamp01(sampleCustomEase(points, tangentById, t));
        const pos = toSvgPoint({ x: t, y });
        smoothPath += i === 0 ? `M ${pos.x} ${pos.y}` : ` L ${pos.x} ${pos.y}`;
    }
    svgState.curve.setAttribute("d", smoothPath);

    svgState.handleLayer.innerHTML = "";
    for (let i = 0; i < points.length; i += 1) {
        const point = points[i];
        const slope = Number(tangentById[point.id]) || 0;
        const anchor = toSvgPoint(point);
        const tangent = toSvgPoint(tangentHandlePoint(point, slope));

        const handleLine = createSvgElement("line", {
            x1: anchor.x,
            y1: anchor.y,
            x2: tangent.x,
            y2: tangent.y,
            class: "editor-handle-line"
        });
        svgState.handleLayer.appendChild(handleLine);

        const tangentHandle = createSvgElement("circle", {
            cx: tangent.x,
            cy: tangent.y,
            r: "5",
            class: "editor-tangent-handle",
            "data-handle-kind": "tangent",
            "data-handle-id": point.id
        });
        svgState.handleLayer.appendChild(tangentHandle);

        const classes = point.fixed ? "editor-handle fixed" : "editor-handle";
        const anchorHandle = createSvgElement("circle", {
            cx: anchor.x,
            cy: anchor.y,
            r: point.fixed ? "5" : "6",
            class: classes,
            "data-handle-kind": "anchor",
            "data-handle-id": point.id
        });
        svgState.handleLayer.appendChild(anchorHandle);
    }
}

function sampleCustomEase(points, tangentById, t) {
    if (t <= points[0].x) return points[0].y;
    if (t >= points[points.length - 1].x) return points[points.length - 1].y;

    for (let i = 0; i < points.length - 1; i += 1) {
        const a = points[i];
        const b = points[i + 1];
        if (t <= b.x) {
            const span = b.x - a.x || 1;
            const s = (t - a.x) / span;
            const s2 = s * s;
            const s3 = s2 * s;
            const h00 = 2 * s3 - 3 * s2 + 1;
            const h10 = s3 - 2 * s2 + s;
            const h01 = -2 * s3 + 3 * s2;
            const h11 = s3 - s2;
            const m0 = Number(tangentById[a.id]) || 0;
            const m1 = Number(tangentById[b.id]) || 0;
            return h00 * a.y + h10 * span * m0 + h01 * b.y + h11 * span * m1;
        }
    }

    return points[points.length - 1].y;
}

function computeAutoTangents(points) {
    const count = points.length;
    if (count < 2) return [0];
    if (count === 2) {
        const dx = points[1].x - points[0].x || 1;
        const slope = (points[1].y - points[0].y) / dx;
        return [slope, slope];
    }

    const h = new Array(count - 1);
    const d = new Array(count - 1);
    for (let i = 0; i < count - 1; i += 1) {
        h[i] = Math.max(1e-6, points[i + 1].x - points[i].x);
        d[i] = (points[i + 1].y - points[i].y) / h[i];
    }

    const m = new Array(count);
    m[0] = d[0];
    m[count - 1] = d[count - 2];

    for (let i = 1; i < count - 1; i += 1) {
        if (d[i - 1] * d[i] <= 0) {
            m[i] = 0;
            continue;
        }
        const w1 = 2 * h[i] + h[i - 1];
        const w2 = h[i] + 2 * h[i - 1];
        m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }

    return m;
}

function seedTangents(points, tangentById) {
    const auto = computeAutoTangents(points);
    for (let i = 0; i < points.length; i += 1) {
        tangentById[points[i].id] = auto[i] || 0;
    }
}

function buildCssLinearFunction(points, tangentById) {
    const samples = 18;
    const stops = [];
    for (let i = 0; i <= samples; i += 1) {
        const t = i / samples;
        const y = clamp01(sampleCustomEase(points, tangentById, t));
        stops.push(`${y.toFixed(4)} ${(t * 100).toFixed(1)}%`);
    }
    return `linear(${stops.join(", ")})`;
}
