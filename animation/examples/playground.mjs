const codiconStyle = document.createElement("style");
codiconStyle.textContent = `
    @font-face {
        font-family: codicon;
        src: url("https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/base/browser/ui/codicons/codicon/codicon.ttf") format("truetype");
        font-display: block;
    }
`;
document.head.appendChild(codiconStyle);

globalThis.MonacoEnvironment = {
    getWorker(_moduleId, label) {
        const workerMap = {
            json: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/esm/vs/language/json/json.worker.js",
            css: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/esm/vs/language/css/css.worker.js",
            html: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/esm/vs/language/html/html.worker.js",
            javascript: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/esm/vs/language/typescript/ts.worker.js",
            typescript: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/esm/vs/language/typescript/ts.worker.js"
        };

        const workerUrl =
            workerMap[label] || "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/esm/vs/editor/editor.worker.js";

        return new Worker(workerUrl, { type: "module" });
    }
};

const monaco = await import("https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/+esm");

const SETS = {
    stage: {
        label: "Stage",
        dir: "./playground-examples/stage",
        docs: "./docs/stage.html",
        files: {
            html: "html.html",
            css: "css.css",
            javascript: "javascript.mjs",
            controls: "controls.html",
            readme: "README.md"
        }
    },
    viewer_stage: {
        label: "Viewer + Stage",
        dir: "./playground-examples/viewer-stage",
        docs: "./docs/viewer-stage.html",
        files: {
            html: "html.html",
            css: "css.css",
            cssAfter: "css.after.css",
            javascript: "javascript.mjs",
            javascriptBefore: "javascript.before.mjs",
            controls: "controls.html",
            readme: "README.md"
        }
    },
    sprite_base: {
        label: "Sprite Base",
        dir: "./playground-examples/sprite-base",
        docs: "./docs/sprite-base.html",
        files: {
            html: "html.html",
            css: "css.css",
            javascript: "javascript.mjs",
            controls: "controls.html",
            readme: "README.md"
        }
    },
    sprite_extended: {
        label: "Sprite Extended",
        dir: "./playground-examples/sprite-extended",
        docs: "./docs/sprite-extended.html",
        files: {
            html: "html.html",
            css: "css.css",
            javascript: "javascript.mjs",
            controls: "controls.html",
            readme: "README.md"
        }
    },
    body: {
        label: "Body",
        dir: "./playground-examples/body",
        docs: "./docs/body.html",
        files: {
            html: "html.html",
            css: "css.css",
            javascript: "javascript.mjs",
            controls: "controls.html",
            readme: "README.md"
        }
    },
    timeline: {
        label: "Timeline",
        dir: "./playground-examples/timeline",
        docs: "./docs/timeline.html",
        files: {
            html: "html.html",
            css: "css.css",
            javascript: "javascript.mjs",
            controls: "controls.html",
            readme: "README.md"
        }
    },
    easing: {
        label: "Easing",
        dir: "./playground-examples/easing",
        docs: "./docs/easing.html",
        files: {
            html: "html.html",
            css: "css.css",
            javascript: "javascript.mjs",
            controls: "controls.html",
            readme: "README.md"
        }
    },
    custom_easing: {
        label: "Custom Easing",
        dir: "./playground-examples/custom-easing",
        docs: "./docs/custom-easing.html",
        files: {
            html: "html.html",
            css: "css.css",
            javascript: "javascript.mjs",
            controls: "controls.html",
            readme: "README.md"
        }
    },
    particle_world: {
        label: "Particle World",
        dir: "./playground-examples/particle-world",
        docs: "./docs/particle-world.html",
        files: {
            html: "html.html",
            css: "css.css",
            javascript: "javascript.mjs",
            controls: "controls.html",
            readme: "README.md"
        }
    },
    emitter: {
        label: "Emitter",
        dir: "./playground-examples/emitter",
        docs: "./docs/emitter.html",
        files: {
            html: "html.html",
            css: "css.css",
            javascript: "javascript.mjs",
            controls: "controls.html",
            readme: "README.md"
        }
    }
};

const setSelect = document.getElementById("example-set");
const fileList = document.getElementById("file-list");
const preview = document.getElementById("preview");
const resetFilesButton = document.getElementById("reset-files");
const editorEl = document.getElementById("editor");
const readmeViewEl = document.getElementById("readme-view");
const docsViewEl = document.getElementById("docs-view");
const docsPreviewEl = document.getElementById("docs-preview");

let currentSetId = "stage";
let currentFileKey = null;
let currentSetFiles = null;
let editor = null;
let renderTimer = null;
let componentRefreshTimer = null;
let infoPanelTimer = null;
let componentManifest = { componentsByTag: {} };
let sceneComponents = [];
let selectedComponentTag = "";
let selectedComponentPath = "";
let selectedComponentIndex = 0;

const sources = new Map();
const originalSources = new Map();
const models = new Map();
const resolvedBySet = new Map();
const FILE_TABS = ["html", "controls", "javascript", "css", "readme", "docs"];
const EDITABLE_TABS = new Set(["html", "controls", "javascript", "css"]);

function setPath(set, file) {
    return `${set.dir}/${file}`;
}

function stripInjectedDevScripts(html, options = {}) {
    const { aggressiveInline = false } = options;
    let out = html;

    out = out.replace(
        /<!--\s*Code injected by live-server\s*-->[\s\S]*?<script[^>]*>[\s\S]*?<\/script>\s*<!--\s*Code injected by live-server\s*-->/gi,
        ""
    );
    out = out.replace(/<!--\s*Code injected by live-server[\s\S]*?<\/script>/gi, "");
    out = out.replace(
        /<script[^>]*src=["'][^"']*(livereload|live-server|hot-update|sockjs|vite\/client|browser-sync)[^"']*["'][^>]*><\/script>/gi,
        ""
    );

    if (aggressiveInline) {
        out = out.replace(
            /<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?(refreshCSS|live-?reload|WebSocket|hot-update|vite\/client|browser-sync|\/ws)[\s\S]*?<\/script>/gi,
            ""
        );
    }

    return out;
}

function rewriteJsImports(code, baseAbs) {
    const rewriteSpec = (spec) => {
        if (!spec.startsWith(".") && !spec.startsWith("/")) return spec;
        return new URL(spec, baseAbs).href;
    };

    let out = code.replace(
        /(import\s*\(\s*|import\s+[^;\n]*?\sfrom\s+|export\s+[^;\n]*?\sfrom\s+)(["'])([^"']+)\2/g,
        (match, prefix, quote, spec) => `${prefix}${quote}${rewriteSpec(spec)}${quote}`
    );

    out = out.replace(
        /(^\s*import\s+)(["'])([^"']+)\2/gm,
        (match, prefix, quote, spec) => `${prefix}${quote}${rewriteSpec(spec)}${quote}`
    );

    return out;
}

function rewriteHtml(html, entryAbs, inlineModules) {
    const baseHref = new URL(".", entryAbs).href;
    const previewCssHref = new URL("../../../../brand/templates/css/playground-preview.css", entryAbs).href;
    let out = stripInjectedDevScripts(html, { aggressiveInline: true });

    out = out.replace(
        /<script\s+([^>]*type=["']module["'][^>]*?)src=["']([^"']+)["']([^>]*)><\/script>/gi,
        (match, _before, src) => {
            const absolute = src.startsWith(".") || src.startsWith("/") ? new URL(src, entryAbs).href : src;
            const code = inlineModules[absolute];
            if (typeof code === "string") {
                return `<script type="module">${code}<\/script>`;
            }
            return `<script type="module" src="${absolute}"><\/script>`;
        }
    );

    out = out.replace(
        /<script\s+[^>]*type=["']module["'][^>]*>([\s\S]*?)<\/script>/gi,
        (match, js) => `<script type="module">${rewriteJsImports(js, entryAbs)}<\/script>`
    );

    const debugHookTag = `<script>
window.addEventListener('error', function(e){
  var pre = document.getElementById('__playground_runtime_error__');
  if(!pre){
    pre = document.createElement('pre');
    pre.id = '__playground_runtime_error__';
    pre.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;max-height:45%;overflow:auto;z-index:999999;background:#2a0f0f;color:#ffd7d7;border:1px solid #8b2a2a;border-radius:6px;padding:8px;margin:0;font:12px/1.3 monospace;white-space:pre-wrap';
    document.body.appendChild(pre);
  }
  pre.textContent = (pre.textContent ? pre.textContent + '\\n' : '') + '[error] ' + (e.message || 'Unknown error');
});
window.addEventListener('unhandledrejection', function(e){
  var pre = document.getElementById('__playground_runtime_error__');
  if(!pre){
    pre = document.createElement('pre');
    pre.id = '__playground_runtime_error__';
    pre.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;max-height:45%;overflow:auto;z-index:999999;background:#2a0f0f;color:#ffd7d7;border:1px solid #8b2a2a;border-radius:6px;padding:8px;margin:0;font:12px/1.3 monospace;white-space:pre-wrap';
    document.body.appendChild(pre);
  }
  pre.textContent = (pre.textContent ? pre.textContent + '\\n' : '') + '[rejection] ' + String(e.reason || 'Unknown rejection');
});
<\/script>`;

    if (/<head[^>]*>/i.test(out)) {
        out = out.replace(
            /<head[^>]*>/i,
            (headTag) =>
                `${headTag}\n<base href="${baseHref}">\n<link rel="stylesheet" href="${previewCssHref}" />\n${debugHookTag}`
        );
    } else {
        out = `<head><base href="${baseHref}">\n<link rel="stylesheet" href="${previewCssHref}" />\n${debugHookTag}</head>\n${out}`;
    }

    return out;
}

function splitPreviewLayout(html) {
    const template = document.createElement("template");
    template.innerHTML = html || "";
    const fragment = template.content;

    const selector = ".controls, #controls, [data-playground-footer]";
    const candidates = Array.from(fragment.querySelectorAll(selector));
    const selected = [];

    for (let i = 0; i < candidates.length; i += 1) {
        const element = candidates[i];
        const hasSelectedAncestor = selected.some((ancestor) => ancestor.contains(element));
        if (!hasSelectedAncestor) selected.push(element);
    }

    const footerParts = [];
    for (let i = 0; i < selected.length; i += 1) {
        footerParts.push(selected[i].outerHTML);
        selected[i].remove();
    }

    return {
        main: fragment.innerHTML,
        footer: footerParts.join("\n")
    };
}

function splitFooterDrawerSections(footerRaw) {
    const footerText = typeof footerRaw === "string" ? footerRaw : String(footerRaw ?? "");
    const template = document.createElement("template");
    template.innerHTML = footerText;
    const fragment = template.content;
    const maskSection = fragment.querySelector(".controls-mask");
    const maskHtml = maskSection ? maskSection.outerHTML : "";
    if (maskSection) maskSection.remove();
    return {
        controlsHtml: String(fragment.innerHTML || "").trim(),
        maskHtml: String(maskHtml || "").trim()
    };
}

function pathLanguage(path) {
    if (path.endsWith(".html")) return "html";
    if (path.endsWith(".css")) return "css";
    if (path.endsWith(".json")) return "json";
    if (path.endsWith(".md")) return "markdown";
    return "javascript";
}

function escapeHtml(text) {
    return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function getPreviewUi() {
    const doc = preview?.contentDocument;
    if (!doc) return null;

    return {
        doc,
        infoButtonEl: doc.getElementById("preview-info-button"),
        infoPanelEl: doc.getElementById("preview-info-panel"),
        controlsButtonEl: doc.getElementById("preview-controls-button"),
        maskButtonEl: doc.getElementById("preview-mask-button"),
        controlsCloseEl: doc.getElementById("preview-controls-close"),
        footerEl: doc.querySelector("#root > footer"),
        infoReadoutEl: doc.getElementById("preview-info-readout"),
        componentButtonsEl: doc.getElementById("preview-component-buttons"),
        inspectorOverlayEl: doc.getElementById("preview-component-inspector-overlay"),
        inspectorTitleEl: doc.getElementById("preview-component-inspector-title"),
        inspectorSubtitleEl: doc.getElementById("preview-component-inspector-subtitle"),
        inspectorBodyEl: doc.getElementById("preview-component-inspector-body"),
        inspectorCloseEl: doc.getElementById("preview-component-inspector-close")
    };
}

function setFooterPanelOpen(panel) {
    const ui = getPreviewUi();
    if (!ui?.footerEl) return;
    const canOpenControls = ui.footerEl.classList.contains("has-controls");
    const canOpenMask = ui.footerEl.classList.contains("has-mask");
    const nextPanel =
        panel === "controls" && canOpenControls ? "controls" : panel === "mask" && canOpenMask ? "mask" : "";
    const nextOpen = nextPanel.length > 0;

    ui.footerEl.classList.toggle("open", nextOpen);
    ui.footerEl.classList.toggle("panel-controls", nextPanel === "controls");
    ui.footerEl.classList.toggle("panel-mask", nextPanel === "mask");

    if (ui.controlsButtonEl) {
        const active = nextPanel === "controls";
        ui.controlsButtonEl.classList.toggle("active", active);
        ui.controlsButtonEl.setAttribute("aria-expanded", active ? "true" : "false");
        ui.controlsButtonEl.textContent = active ? "Hide Controls" : "Controls";
    }

    if (ui.maskButtonEl) {
        const active = nextPanel === "mask";
        ui.maskButtonEl.classList.toggle("active", active);
        ui.maskButtonEl.setAttribute("aria-expanded", active ? "true" : "false");
        ui.maskButtonEl.textContent = active ? "Hide Mask" : "Load Mask";
    }
}

function setControlsPanelOpen(open) {
    setFooterPanelOpen(open ? "controls" : "");
}

function setMaskPanelOpen(open) {
    setFooterPanelOpen(open ? "mask" : "");
}

function bindPreviewChromeEvents() {
    const ui = getPreviewUi();
    if (!ui || ui.doc.__playgroundChromeBound) return;
    ui.doc.__playgroundChromeBound = true;

    ui.infoButtonEl?.addEventListener("click", (event) => {
        event.stopPropagation();
        const willOpen = !ui.infoPanelEl?.classList.contains("open");
        setInfoPanelOpen(Boolean(willOpen));
    });

    ui.doc.addEventListener("click", (event) => {
        if (!ui.infoPanelEl?.classList.contains("open")) return;
        const target = event.target;
        const clickedButton = ui.infoButtonEl && ui.infoButtonEl.contains(target);
        const clickedPanel = ui.infoPanelEl.contains(target);
        if (!clickedButton && !clickedPanel) {
            setInfoPanelOpen(false);
        }
    });

    ui.inspectorCloseEl?.addEventListener("click", () => {
        closeComponentInspector();
    });

    ui.inspectorOverlayEl?.addEventListener("click", (event) => {
        if (event.target === ui.inspectorOverlayEl) {
            closeComponentInspector();
        }
    });

    ui.controlsButtonEl?.addEventListener("click", () => {
        const isOpen = ui.footerEl?.classList.contains("open") && ui.footerEl?.classList.contains("panel-controls");
        setControlsPanelOpen(!isOpen);
    });

    ui.maskButtonEl?.addEventListener("click", () => {
        const isOpen = ui.footerEl?.classList.contains("open") && ui.footerEl?.classList.contains("panel-mask");
        setMaskPanelOpen(!isOpen);
    });

    ui.controlsCloseEl?.addEventListener("click", () => {
        setControlsPanelOpen(false);
    });
}

async function loadComponentManifest() {
    try {
        const response = await fetch("../components/component-manifest.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`Failed to load component manifest (${response.status})`);
        const data = await response.json();
        if (!data || typeof data !== "object") return { componentsByTag: {} };
        if (!data.componentsByTag || typeof data.componentsByTag !== "object") return { componentsByTag: {} };
        return data;
    } catch (error) {
        console.warn("[playground] Component manifest unavailable:", error);
        return { componentsByTag: {} };
    }
}

function sourceTabLabel(path) {
    if (path === currentSetFiles?.html?.path) return "html";
    if (path === currentSetFiles?.controls?.path) return "controls";
    if (path === currentSetFiles?.javascript?.path) return "javascript";
    if (path === currentSetFiles?.css?.path) return "css";
    return path;
}

function isNumberType(type) {
    return type === "number" || type === "int";
}

function escapeAttributeValue(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;");
}

function attributeSelectOptions(tag, attrName, currentValue, defaultValue) {
    const perAttribute = {
        state: ["initial", "active", "inactive", "complete", "actve", "inactve"],
        anchor: [
            "center center",
            "left top",
            "center top",
            "right top",
            "left center",
            "right center",
            "left bottom",
            "center bottom",
            "right bottom"
        ],
        renderer: ["canvas", "webgl"],
        speed: ["0.1", "0.25", "0.5", "1", "1.5", "2", "3", "4"],
        minspeed: ["0.01", "0.05", "0.1", "0.25", "0.5", "1"],
        maxspeed: ["1", "2", "3", "4", "6", "8"],
        stepspeed: ["0.01", "0.05", "0.1", "0.25", "0.5", "1"],
        metadata: ["false", "true"],
        debug: ["false", "true"],
        reverse: ["false", "true"]
    };

    const base = perAttribute[attrName];
    if (!Array.isArray(base) || !base.length) return [];

    const out = [...base];
    const addIfMissing = (value) => {
        const text = String(value ?? "").trim();
        if (!text.length) return;
        if (!out.includes(text)) out.push(text);
    };

    addIfMissing(defaultValue);
    addIfMissing(currentValue);
    return out;
}

function useSuggestedInput(attr) {
    return String(attr?.name || "").toLowerCase() === "anchor";
}

function updateOpenTagAttribute(openTag, attributeName, type, value) {
    const closeMatch = openTag.match(/\s*\/?>$/);
    if (!closeMatch) return openTag;

    const close = closeMatch[0];
    const head = openTag.slice(0, openTag.length - close.length);
    const escaped = attributeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const attrRegex = new RegExp(`\\s+${escaped}(?:\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+))?`, "i");
    const hasAttribute = attrRegex.test(head);

    if (type === "exists") {
        if (value) {
            if (hasAttribute) return openTag;
            return `${head} ${attributeName}${close}`;
        }
        if (!hasAttribute) return openTag;
        return `${head.replace(attrRegex, "")}${close}`;
    }

    const normalized = String(value ?? "").trim();
    if (!normalized.length) {
        if (!hasAttribute) return openTag;
        return `${head.replace(attrRegex, "")}${close}`;
    }

    const nextAttr = ` ${attributeName}="${escapeAttributeValue(normalized)}"`;
    if (hasAttribute) {
        return `${head.replace(attrRegex, nextAttr)}${close}`;
    }
    return `${head}${nextAttr}${close}`;
}

function updateTagAttributeInSource(sourceText, tag, index, attributeName, type, value) {
    const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`<${escapedTag}\\b[^>]*>`, "gi");
    let match;
    let hit = 0;

    while ((match = regex.exec(sourceText)) !== null) {
        if (hit === index) {
            const openTag = match[0];
            const updated = updateOpenTagAttribute(openTag, attributeName, type, value);
            if (updated === openTag) return sourceText;
            return `${sourceText.slice(0, match.index)}${updated}${sourceText.slice(match.index + openTag.length)}`;
        }
        hit += 1;
    }

    return sourceText;
}

function parseSourceComponents(path, sourceText) {
    const tags = componentManifest.componentsByTag || {};
    if (!path || !sourceText || !Object.keys(tags).length) return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(`<body>${sourceText}</body>`, "text/html");
    const counters = new Map();
    const components = [];
    const elements = Array.from(doc.body.querySelectorAll("*"));

    for (let i = 0; i < elements.length; i += 1) {
        const element = elements[i];
        const tag = element.tagName.toLowerCase();
        if (!tags[tag]) continue;

        const index = counters.get(tag) || 0;
        counters.set(tag, index + 1);

        const attributes = {};
        const names = element.getAttributeNames();
        for (let n = 0; n < names.length; n += 1) {
            const name = names[n];
            attributes[name] = element.getAttribute(name);
        }

        components.push({
            tag,
            path,
            index,
            id: element.getAttribute("id") || "",
            attributes
        });
    }

    return components;
}

function collectSceneComponents() {
    if (!currentSetFiles) return [];
    const files = [currentSetFiles.html, currentSetFiles.controls].filter(Boolean);
    const out = [];

    for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const sourceText = sources.get(file.path) || "";
        out.push(...parseSourceComponents(file.path, sourceText));
    }

    return out;
}

function queueComponentRefresh() {
    clearTimeout(componentRefreshTimer);
    componentRefreshTimer = setTimeout(() => {
        refreshSceneComponents();
    }, 110);
}

function refreshSceneComponents() {
    sceneComponents = collectSceneComponents();
    renderComponentButtons();
    const ui = getPreviewUi();
    if (ui?.inspectorOverlayEl?.classList.contains("open")) {
        renderComponentInspector();
    }
    refreshInfoReadout();
}

function getComponentSelection() {
    const instances = sceneComponents.filter((item) => item.tag === selectedComponentTag);
    if (!instances.length) return { instances, selected: null };

    let selected = instances.find(
        (item) => item.path === selectedComponentPath && item.index === selectedComponentIndex
    );
    if (!selected) {
        selected = instances[0];
        selectedComponentPath = selected.path;
        selectedComponentIndex = selected.index;
    }

    return { instances, selected };
}

function renderComponentButtons() {
    const ui = getPreviewUi();
    if (!ui?.componentButtonsEl || !ui.doc) return;
    const { doc, componentButtonsEl, inspectorOverlayEl } = ui;
    componentButtonsEl.innerHTML = "";

    if (!sceneComponents.length) {
        const empty = doc.createElement("span");
        empty.textContent = "No animation components";
        empty.style.fontSize = "12px";
        empty.style.opacity = "0.75";
        componentButtonsEl.appendChild(empty);
        return;
    }

    const counts = new Map();
    for (let i = 0; i < sceneComponents.length; i += 1) {
        const tag = sceneComponents[i].tag;
        counts.set(tag, (counts.get(tag) || 0) + 1);
    }

    const tags = Array.from(counts.keys()).sort((a, b) => a.localeCompare(b));
    for (let i = 0; i < tags.length; i += 1) {
        const tag = tags[i];
        const count = counts.get(tag) || 1;
        const button = doc.createElement("button");
        button.type = "button";
        button.className = "playground-header-btn";
        button.textContent = count > 1 ? `${tag} (${count})` : tag;
        const isActive = inspectorOverlayEl?.classList.contains("open") && selectedComponentTag === tag;
        if (isActive) button.classList.add("active");
        button.addEventListener("click", () => {
            openComponentInspector(tag);
        });
        componentButtonsEl.appendChild(button);
    }
}

function setInfoPanelOpen(open) {
    const ui = getPreviewUi();
    if (!ui?.infoPanelEl) {
        if (!open && infoPanelTimer) {
            clearInterval(infoPanelTimer);
            infoPanelTimer = null;
        }
        return;
    }
    const { infoPanelEl } = ui;
    infoPanelEl.classList.toggle("open", open);
    if (open) {
        refreshInfoReadout();
        if (!infoPanelTimer) {
            infoPanelTimer = setInterval(() => {
                refreshInfoReadout();
            }, 250);
        }
    } else if (infoPanelTimer) {
        clearInterval(infoPanelTimer);
        infoPanelTimer = null;
    }
}

function formatNumber(value, digits = 2) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(digits) : "n/a";
}

function buildInfoReadout() {
    const lines = [];
    const setLabel = SETS[currentSetId]?.label || currentSetId;
    lines.push(`set: ${setLabel} (${currentSetId})`);
    lines.push(`components in source: ${sceneComponents.length}`);

    const previewDoc = preview?.contentDocument;
    if (!previewDoc) {
        lines.push("preview: loading...");
        return lines.join("\n");
    }

    try {
        const stage = previewDoc.querySelector("animation-stage");
        const viewer = previewDoc.querySelector("animation-viewer");
        const timeline = viewer?.timeline || stage?.timeline || null;
        const owner = viewer ? "viewer timeline" : stage ? "stage (local timeline)" : "none";
        lines.push(`timeline owner: ${owner}`);

        if (timeline) {
            lines.push(`timeline state: ${timeline.paused ? "paused" : "playing"}`);
            lines.push(`timeline time: ${formatNumber(timeline.time?.seconds, 3)}s`);
            lines.push(`timeline scale: ${formatNumber(timeline.timeScale, 2)}x`);
            if (timeline.time?.fps !== undefined) {
                lines.push(`timeline fps: ${formatNumber(timeline.time.fps, 1)}`);
            }
        } else {
            lines.push("timeline: unavailable");
        }

        if (stage) {
            const stagePixels = stage.dimentions || null;
            const stageWidth = stagePixels?.width ?? stage.width;
            const stageHeight = stagePixels?.height ?? stage.height;
            lines.push(`stage size: ${formatNumber(stageWidth, 0)} x ${formatNumber(stageHeight, 0)}`);
            lines.push(`stage position: (${formatNumber(stage.x, 1)}, ${formatNumber(stage.y, 1)})`);
            const anchor = stage.anchorPoint;
            if (anchor) {
                lines.push(`stage anchorPoint: (${formatNumber(anchor.x, 1)}, ${formatNumber(anchor.y, 1)})`);
            }
        } else {
            lines.push("stage: unavailable");
        }

        const sprite = previewDoc.querySelector("animation-sprite");
        if (sprite) {
            const spriteFrames = Math.max(1, Number(sprite.frames) || 1);
            lines.push(`sprite frame: ${formatNumber(sprite.frame, 0)} / ${formatNumber(spriteFrames - 1, 0)}`);
            lines.push(`sprite viewport: ${formatNumber(sprite.width, 0)} x ${formatNumber(sprite.height, 0)}`);
            lines.push(`sprite scale: ${formatNumber(sprite.scale, 2)}x`);
            lines.push(`sprite tempo: ${formatNumber(sprite.tempo, 3)}s`);
            lines.push(
                `sprite auto: ${sprite.auto ? "true" : "false"}, loop: ${sprite.loop ? "true" : "false"}, paused: ${
                    sprite.paused ? "true" : "false"
                }`
            );
        }

        const probeState = stage?.exampleState || viewer?.exampleState;
        if (probeState) {
            lines.push(`probe local: (${formatNumber(probeState.x, 1)}, ${formatNumber(probeState.y, 1)})`);
        }

        const probeEl = previewDoc.getElementById("probe");
        if (probeEl) {
            lines.push(`probe transform: ${probeEl.style.transform || "none"}`);
        }
    } catch (error) {
        lines.push(`runtime readout error: ${error.message || String(error)}`);
    }

    return lines.join("\n");
}

function refreshInfoReadout() {
    const ui = getPreviewUi();
    if (!ui?.infoReadoutEl) return;
    ui.infoReadoutEl.textContent = buildInfoReadout();
}

function closeComponentInspector() {
    const ui = getPreviewUi();
    if (!ui?.inspectorOverlayEl) return;
    const { inspectorOverlayEl } = ui;
    inspectorOverlayEl.classList.remove("open");
    inspectorOverlayEl.setAttribute("aria-hidden", "true");
    renderComponentButtons();
}

function openComponentInspector(tag) {
    selectedComponentTag = tag;
    const selected = sceneComponents.find((item) => item.tag === tag);
    selectedComponentPath = selected?.path || "";
    selectedComponentIndex = selected?.index || 0;

    const ui = getPreviewUi();
    if (!ui?.inspectorOverlayEl) return;
    const { inspectorOverlayEl } = ui;
    inspectorOverlayEl.classList.add("open");
    inspectorOverlayEl.setAttribute("aria-hidden", "false");
    renderComponentButtons();
    renderComponentInspector();
}

function writeSource(path, nextText) {
    const current = sources.get(path) || "";
    if (current === nextText) return;

    sources.set(path, nextText);
    const model = models.get(path);
    if (model) {
        model.setValue(nextText);
    } else {
        queueRender();
    }
}

function setComponentAttribute(path, tag, index, attributeName, type, value) {
    const sourceText = sources.get(path) || "";
    const updated = updateTagAttributeInSource(sourceText, tag, index, attributeName, type, value);
    if (updated === sourceText) return;
    writeSource(path, updated);
}

function renderComponentInspector() {
    const ui = getPreviewUi();
    if (!ui?.inspectorBodyEl || !ui.inspectorTitleEl || !ui.inspectorSubtitleEl || !ui.doc) return;
    const { doc, inspectorBodyEl, inspectorTitleEl, inspectorSubtitleEl } = ui;

    if (!selectedComponentTag) {
        inspectorTitleEl.textContent = "Component Inspector";
        inspectorSubtitleEl.textContent = "";
        inspectorBodyEl.innerHTML = "<p>Select a component tag from the header.</p>";
        return;
    }

    const entry = componentManifest.componentsByTag?.[selectedComponentTag];
    if (!entry) {
        inspectorTitleEl.textContent = selectedComponentTag;
        inspectorSubtitleEl.textContent = "";
        inspectorBodyEl.innerHTML = "<p>No manifest entry found for this component.</p>";
        return;
    }

    const { instances, selected } = getComponentSelection();
    inspectorTitleEl.textContent = selectedComponentTag;
    inspectorSubtitleEl.textContent = `Extends: ${entry.extends || "unknown"} | Instances: ${instances.length}`;

    if (!selected) {
        inspectorBodyEl.innerHTML = "<p>This component is not present in the active source files.</p>";
        return;
    }

    inspectorBodyEl.innerHTML = "";

    if (instances.length > 1) {
        const picker = doc.createElement("label");
        picker.className = "inspector-field";
        const title = doc.createElement("span");
        title.textContent = "Instance";
        const select = doc.createElement("select");

        for (let i = 0; i < instances.length; i += 1) {
            const instance = instances[i];
            const option = doc.createElement("option");
            option.value = `${instance.path}::${instance.index}`;
            const label = instance.id
                ? `${sourceTabLabel(instance.path)} #${instance.id}`
                : `${sourceTabLabel(instance.path)} [${instance.index + 1}]`;
            option.textContent = label;
            if (instance.path === selected.path && instance.index === selected.index) {
                option.selected = true;
            }
            select.appendChild(option);
        }

        select.addEventListener("change", () => {
            const [path, idx] = select.value.split("::");
            selectedComponentPath = path;
            selectedComponentIndex = Number(idx) || 0;
            renderComponentInspector();
        });

        picker.appendChild(title);
        picker.appendChild(select);
        inspectorBodyEl.appendChild(picker);
    }

    const attributes = Array.isArray(entry.attributes) ? entry.attributes : [];
    for (let i = 0; i < attributes.length; i += 1) {
        const attr = attributes[i];
        const field = doc.createElement("label");
        field.className = "inspector-field";

        const label = doc.createElement("span");
        label.textContent = attr.name;
        field.appendChild(label);

        const present = Object.prototype.hasOwnProperty.call(selected.attributes, attr.name);
        const defaultValue = attr.default === null || typeof attr.default === "undefined" ? "" : String(attr.default);

        if (attr.type === "exists") {
            const checkbox = doc.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = present && selected.attributes[attr.name] !== "false";
            checkbox.addEventListener("change", () => {
                setComponentAttribute(
                    selected.path,
                    selected.tag,
                    selected.index,
                    attr.name,
                    attr.type,
                    checkbox.checked
                );
                queueComponentRefresh();
            });
            field.appendChild(checkbox);
        } else {
            const currentValue = present ? (selected.attributes[attr.name] ?? "") : defaultValue;
            const options = attributeSelectOptions(selected.tag, attr.name, currentValue, defaultValue);

            if (options.length && useSuggestedInput(attr)) {
                const listId = `inspector-${selected.tag}-${attr.name}-${selected.index}`
                    .replaceAll(/[^a-zA-Z0-9_-]/g, "-")
                    .toLowerCase();
                const input = doc.createElement("input");
                input.type = "text";
                input.value = currentValue;
                input.setAttribute("list", listId);
                input.addEventListener("change", () => {
                    setComponentAttribute(
                        selected.path,
                        selected.tag,
                        selected.index,
                        attr.name,
                        attr.type,
                        input.value
                    );
                    queueComponentRefresh();
                });

                const datalist = doc.createElement("datalist");
                datalist.id = listId;
                for (let o = 0; o < options.length; o += 1) {
                    const option = doc.createElement("option");
                    option.value = options[o];
                    datalist.appendChild(option);
                }

                field.appendChild(input);
                inspectorBodyEl.appendChild(field);
                inspectorBodyEl.appendChild(datalist);
                continue;
            } else if (options.length) {
                const select = doc.createElement("select");
                const emptyOption = doc.createElement("option");
                emptyOption.value = "";
                emptyOption.textContent = "(unset)";
                select.appendChild(emptyOption);

                for (let o = 0; o < options.length; o += 1) {
                    const option = doc.createElement("option");
                    option.value = options[o];
                    option.textContent = options[o];
                    select.appendChild(option);
                }

                select.value = String(currentValue ?? "").trim();
                if (!select.value) {
                    select.value = "";
                }

                select.addEventListener("change", () => {
                    setComponentAttribute(
                        selected.path,
                        selected.tag,
                        selected.index,
                        attr.name,
                        attr.type,
                        select.value
                    );
                    queueComponentRefresh();
                });

                field.appendChild(select);
            } else {
                const input = doc.createElement("input");
                input.type = isNumberType(attr.type) ? "number" : "text";
                if (attr.type === "int") input.step = "1";
                if (attr.type === "number") input.step = "any";
                input.value = currentValue;
                input.addEventListener("change", () => {
                    setComponentAttribute(
                        selected.path,
                        selected.tag,
                        selected.index,
                        attr.name,
                        attr.type,
                        input.value
                    );
                    queueComponentRefresh();
                });
                field.appendChild(input);
            }
        }

        inspectorBodyEl.appendChild(field);
    }

    const methods = Array.isArray(entry.methods) ? entry.methods : [];
    if (methods.length) {
        const details = doc.createElement("details");
        const summary = doc.createElement("summary");
        summary.textContent = `Methods (${methods.length})`;
        details.appendChild(summary);

        const list = doc.createElement("ul");
        for (let i = 0; i < methods.length; i += 1) {
            const method = methods[i];
            const item = doc.createElement("li");
            const params = Array.isArray(method.params) ? method.params.join(", ") : "";
            item.textContent = `${method.name}(${params})`;
            list.appendChild(item);
        }
        details.appendChild(list);
        inspectorBodyEl.appendChild(details);
    }
}

function renderFiles() {
    fileList.innerHTML = "";
    if (!currentSetFiles) return;

    for (let i = 0; i < FILE_TABS.length; i += 1) {
        const key = FILE_TABS[i];
        const file = currentSetFiles[key];
        if (!file) continue;

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = key;
        button.classList.toggle("active", key === currentFileKey);
        button.addEventListener("click", () => switchFile(key));

        const li = document.createElement("li");
        li.appendChild(button);
        fileList.appendChild(li);
    }
}

function switchFile(key) {
    if (!currentSetFiles || !currentSetFiles[key]) return;
    currentFileKey = key;
    renderFiles();

    const isReadme = key === "readme";
    const isDocs = key === "docs";
    const isCode = !isReadme && !isDocs;

    if (isCode) {
        const model = models.get(currentSetFiles[key].path);
        if (model && editor.getModel() !== model) {
            editor.setModel(model);
        }
        editor.updateOptions({ readOnly: !EDITABLE_TABS.has(key) });
    }

    if (editorEl) {
        editorEl.style.display = isCode ? "" : "none";
    }

    if (readmeViewEl) {
        readmeViewEl.style.display = isReadme ? "block" : "none";
        if (isReadme) {
            const markdown = sources.get(currentSetFiles.readme.path) || "";
            renderReadmePanel(markdown);
        }
    }

    if (docsViewEl) {
        docsViewEl.style.display = isDocs ? "block" : "none";
    }

    if (isDocs && docsPreviewEl) {
        docsPreviewEl.src = currentSetFiles.docs.path;
    }
    renderPreview();
}

function disposeModels() {
    for (const model of models.values()) {
        model.dispose();
    }
    models.clear();
}

function queueRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
        renderPreview();
    }, 220);
}

async function fetchText(path, options = {}) {
    const { sanitizeHtml = false, aggressiveInline = true } = options;
    const response = await fetch(path, { cache: "no-store" });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    let text = await response.text();
    if (sanitizeHtml) {
        text = stripInjectedDevScripts(text, { aggressiveInline });
    }
    return text;
}

async function resolveExact(set, file, options = {}, required = false) {
    if (!file) return null;
    const path = setPath(set, file);
    const text = await fetchText(path, options);
    if (text !== null) return { path, text };
    if (required) {
        throw new Error(`Missing required file: ${path}`);
    }
    return null;
}

async function resolveSetFiles(set) {
    const files = set.files || {};
    const htmlMain = await resolveExact(
        set,
        files.html || "html.html",
        {
            sanitizeHtml: true,
            aggressiveInline: true
        },
        true
    );

    const htmlBefore = await resolveExact(set, files.htmlBefore, {
        sanitizeHtml: true,
        aggressiveInline: true
    });
    const htmlAfter = await resolveExact(set, files.htmlAfter, {
        sanitizeHtml: true,
        aggressiveInline: true
    });

    const cssBefore = await resolveExact(set, files.cssBefore);
    const cssMain = await resolveExact(set, files.css || "css.css", {}, true);
    const cssAfter = await resolveExact(set, files.cssAfter);

    const jsBefore = await resolveExact(set, files.javascriptBefore);
    const jsMain = await resolveExact(set, files.javascript || "javascript.mjs", {}, true);
    const jsAfter = await resolveExact(set, files.javascriptAfter);
    const controls = await resolveExact(set, files.controls);

    const readme = await resolveExact(set, files.readme || "README.md");
    let docs = null;
    if (typeof set.docs === "string" && set.docs.trim().length > 0) {
        const docsText = await fetchText(set.docs);
        if (docsText !== null) {
            docs = { path: set.docs, text: docsText };
        }
    }

    return {
        html: { before: htmlBefore, main: htmlMain, after: htmlAfter },
        css: { before: cssBefore, main: cssMain, after: cssAfter },
        javascript: { before: jsBefore, main: jsMain, after: jsAfter },
        controls,
        readme,
        docs
    };
}

function buildComposedDocument(resolved) {
    const htmlMainPath = resolved.html.main.path;
    const htmlMain = sources.get(htmlMainPath) || "";
    const splitLayout = splitPreviewLayout(htmlMain);
    const controlsPath = resolved.controls?.path || "";
    const loadedControlsHtml = controlsPath ? (sources.get(controlsPath) ?? resolved.controls?.text ?? "") : "";
    const controlsHtml = typeof loadedControlsHtml === "string" ? loadedControlsHtml : String(loadedControlsHtml ?? "");
    const splitFooter = typeof splitLayout.footer === "string" ? splitLayout.footer : String(splitLayout.footer ?? "");
    const footerRaw = controlsHtml.trim().length ? controlsHtml : splitFooter;
    const hasFooterControls = footerRaw.trim().length > 0;
    const useControlsDrawer = currentSetId === "particle_world" && hasFooterControls;
    const drawerSections = useControlsDrawer ? splitFooterDrawerSections(footerRaw) : null;
    const splitControlsMarkup = useControlsDrawer ? String(drawerSections?.controlsHtml || "").trim() : "";
    const splitMaskMarkup = useControlsDrawer ? String(drawerSections?.maskHtml || "").trim() : "";
    const hasMaskDrawer = useControlsDrawer && splitMaskMarkup.length > 0;
    const controlsDrawerMarkup = useControlsDrawer
        ? splitControlsMarkup.length > 0
            ? splitControlsMarkup
            : footerRaw
        : footerRaw;
    const maskDrawerMarkup = hasMaskDrawer ? splitMaskMarkup : "";
    const footerMarkup = hasFooterControls ? `<div id="controls">${controlsDrawerMarkup}</div>` : "";
    const maskMarkup = hasMaskDrawer ? `<div id="mask-controls" class="drawer-panel">${maskDrawerMarkup}</div>` : "";
    const footerClass = useControlsDrawer ? ` class="has-controls${hasMaskDrawer ? " has-mask" : ""}"` : "";
    const htmlBefore = resolved.html.before?.text || "";
    const htmlAfter = resolved.html.after?.text || "";

    const cssMainPath = resolved.css.main.path;
    const cssMain = sources.get(cssMainPath) || "";
    const cssChunks = [resolved.css.before?.text, cssMain, resolved.css.after?.text].filter(
        (text) => text && text.trim().length > 0
    );
    const cssTag = cssChunks.length ? `<style>\n${cssChunks.join("\n")}\n</style>` : "";

    const inlineModules = {};
    const jsMainPath = resolved.javascript.main.path;
    const jsMain = sources.get(jsMainPath) || "";
    const scripts = [resolved.javascript.before, { path: jsMainPath, text: jsMain }, resolved.javascript.after].filter(
        (slot) => slot && slot.text && slot.text.trim().length > 0
    );
    const scriptTags = [];

    for (let i = 0; i < scripts.length; i += 1) {
        const slot = scripts[i];
        const abs = new URL(slot.path, location.href).href;
        let code = rewriteJsImports(slot.text, abs);
        code = code.replace(/<\/script>/gi, "<\\/script>");
        inlineModules[abs] = code;
        scriptTags.push(`<script type="module" src="${abs}"><\/script>`);
    }

    const doc = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
${cssTag}
</head>
<body>
${htmlBefore}
<div id="root">
<header>
<div class="playground-header-left">
<div class="playground-info-menu">
<button id="preview-info-button" type="button" class="playground-header-btn">Info</button>
<div id="preview-info-panel">
<pre id="preview-info-readout">Loading runtime info...</pre>
</div>
</div>
${useControlsDrawer ? '<button id="preview-controls-button" type="button" class="playground-header-btn" aria-expanded="false">Controls</button>' : ""}
${hasMaskDrawer ? '<button id="preview-mask-button" type="button" class="playground-header-btn" aria-expanded="false">Load Mask</button>' : ""}
</div>
<div id="preview-component-buttons"></div>
</header>
<main>
${htmlMain}
</main>
<footer${footerClass}>
${useControlsDrawer ? '<button id="preview-controls-close" type="button" class="playground-header-btn">Close</button>' : ""}
${footerMarkup}
${maskMarkup}
</footer>
<div id="preview-component-inspector-overlay" aria-hidden="true">
<section class="component-inspector-card" role="dialog" aria-modal="true" aria-label="Component Inspector">
<div class="component-inspector-head">
<h4 id="preview-component-inspector-title">Component Inspector</h4>
<button id="preview-component-inspector-close" type="button" class="playground-header-btn">Close</button>
</div>
<p id="preview-component-inspector-subtitle"></p>
<div id="preview-component-inspector-body"></div>
</section>
</div>
</div>
${htmlAfter}
${scriptTags.join("\n")}
</body>
</html>`;

    return {
        entryAbs: new URL(htmlMainPath, location.href).href,
        doc,
        inlineModules,
        controlsForTab: controlsDrawerMarkup,
        hasFooterControls
    };
}

function renderMarkdownHtml(markdownText) {
    const markdown = markdownText || "";
    const codeBlocks = [];
    const codeToken = (index) => `__JUICE_CODE_${index}__`;

    let normalized = markdown.replace(/\r\n/g, "\n");
    normalized = normalized.replace(/```([\w-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const token = codeToken(codeBlocks.length);
        codeBlocks.push(
            `<pre class="code"><code class="lang-${escapeHtml(lang || "plain")}">${escapeHtml(code)}</code></pre>`
        );
        return token;
    });

    const escapeThenFormatInline = (text) => {
        let out = escapeHtml(text);
        out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
        out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
        out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        return out;
    };

    const lines = normalized.split("\n");
    const parts = [];
    let listOpen = false;

    const closeList = () => {
        if (listOpen) {
            parts.push("</ul>");
            listOpen = false;
        }
    };

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed) {
            closeList();
            continue;
        }

        const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (heading) {
            closeList();
            const level = heading[1].length;
            parts.push(`<h${level}>${escapeThenFormatInline(heading[2])}</h${level}>`);
            continue;
        }

        const list = trimmed.match(/^[-*]\s+(.+)$/);
        if (list) {
            if (!listOpen) {
                parts.push("<ul>");
                listOpen = true;
            }
            parts.push(`<li>${escapeThenFormatInline(list[1])}</li>`);
            continue;
        }

        closeList();
        parts.push(`<p>${escapeThenFormatInline(trimmed)}</p>`);
    }
    closeList();

    let html = parts.join("\n");
    for (let i = 0; i < codeBlocks.length; i += 1) {
        html = html.replaceAll(codeToken(i), codeBlocks[i]);
    }

    return `<style>
.readme-body{margin:0;padding:14px;font:14px/1.5 Segoe UI,Arial,sans-serif;color:#1e2a3a;background:#fff;}
.readme-body h1,.readme-body h2,.readme-body h3,.readme-body h4,.readme-body h5,.readme-body h6{margin:0 0 10px;}
.readme-body p{margin:0 0 10px;}
.readme-body ul{margin:0 0 10px 20px;padding:0;}
.readme-body li{margin:0 0 6px;}
.readme-body code{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;background:#f2f6fd;padding:2px 4px;border-radius:4px;}
.readme-body pre.code{margin:0 0 12px;padding:10px;border:1px solid #d8e2f1;border-radius:8px;background:#f8fbff;overflow:auto;}
.readme-body pre.code code{background:transparent;padding:0;border-radius:0;}
.readme-body a{color:#215fcc;text-decoration:underline;}
</style>${html}`;
}

function renderReadmePanel(markdownText) {
    if (!readmeViewEl) return;
    const docsHref = SETS[currentSetId]?.docs || "./docs/index.html";
    readmeViewEl.innerHTML =
        `<div class="readme-body">${renderMarkdownHtml(markdownText)}</div>` +
        `<div class="readme-doc-link"><a href="${docsHref}" target="_blank" rel="noopener noreferrer">Open full docs page</a></div>`;
}

function showPreviewError(error) {
    const message = escapeHtml(error?.message || String(error));
    preview.srcdoc = `<!doctype html><html><body style="margin:0;padding:12px;background:#1a0f0f;color:#ffd7d7;font:13px/1.4 monospace;"><h3 style="margin-top:0;">Preview Error</h3><pre>${message}</pre></body></html>`;
}

function renderPreview() {
    const resolved = resolvedBySet.get(currentSetId);
    if (!resolved) return;

    try {
        setInfoPanelOpen(false);
        setControlsPanelOpen(false);
        closeComponentInspector();
        const composed = buildComposedDocument(resolved);
        // If the example provides footer controls, move them into the editor Controls tab
        try {
            // Move non-standard footer controls into the outer Controls tab,
            // but keep standard timeline/player/footer elements in the preview.
            if (composed.hasFooterControls && typeof setTabContent === "function") {
                // Split provided controls markup: keep standard '.controls' and '.readout' elements in the preview footer
                // and move any other control blocks into the Controls tab.
                const tpl = document.createElement("template");
                tpl.innerHTML = composed.controlsForTab || "";
                const frag = tpl.content;
                const keepNodes = [];
                const moveNodes = [];
                Array.from(frag.childNodes).forEach((node) => {
                    if (node.nodeType !== 1) return; // ignore text/comments
                    const cls = node.classList || null;
                    const selector =
                        ".timeline, .timeline-controls, #timeline, #timeline-controls, .controls, .readout, .controls-config, timeline-controls, timeline";
                    const matchesSelf = node.matches && node.matches(selector);
                    const containsTimeline =
                        matchesSelf ||
                        (node.querySelector &&
                            node.querySelector(".timeline, .timeline-controls, #timeline, .controls") !== null);
                    const keepCondition =
                        (cls &&
                            (cls.contains("controls") ||
                                cls.contains("readout") ||
                                cls.contains("controls-config") ||
                                cls.contains("timeline") ||
                                cls.contains("timeline-controls"))) ||
                        node.id === "timeline" ||
                        node.id === "timeline-controls" ||
                        containsTimeline ||
                        (node.querySelector && node.querySelector("[data-playground-keep-footer]"));
                    if (keepCondition) {
                        keepNodes.push(node.outerHTML);
                    } else {
                        moveNodes.push(node.outerHTML);
                    }
                });
                const controlsTabHtml = moveNodes.join("\n").trim();
                const footerControlsHtml = keepNodes.join("\n").trim();
                if (controlsTabHtml.length) {
                    // Wrap moved controls in a Juice Forms container so component inputs
                    // (input-text, input-select, etc.) are available. Also import the
                    // Juice Forms runtime and call refresh so it enhances inserted markup.
                    const wrapped =
                        `<juice-forms><form id="playground-controls-form">${controlsTabHtml}</form></juice-forms>`;
                    const script =
                        `<script type="module">import('/forms/juice-forms.mjs').then(()=>{setTimeout(()=>{try{window.JUICE_FORMS&&window.JUICE_FORMS.refresh&&window.JUICE_FORMS.refresh();}catch(e){console.warn('JUICE_FORMS.refresh failed',e);}},50)}).catch(e=>console.warn('import juice-forms failed',e));<\/script>`;
                    setTabContent("controls", wrapped + script);
                } else if (typeof disableTab === "function") {
                    // No extra controls -> disable the Controls tab
                    disableTab("controls");
                }
                else if (typeof disableTab === "function") disableTab("controls");
                // Replace composed.controlsForTab with only the kept footer HTML for preview injection below
                composed._footerControlsHtml = footerControlsHtml || "";
            } else if (typeof disableTab === "function") {
                // no controls -> disable the controls tab
                disableTab("controls");
            }
        } catch (_e) {
            // ignore errors manipulating outer UI
        }
        const finalHtml = rewriteHtml(composed.doc, composed.entryAbs, composed.inlineModules);
        // When controls were provided, ensure only the standard footer parts remain in the preview.
        let docToLoad = finalHtml;
        if (composed.hasFooterControls) {
            const footerKeep = composed._footerControlsHtml || "";
            if (footerKeep.length) {
                // Replace the #controls div content with the kept footer markup
                docToLoad = finalHtml.replace(/(<div\s+id="controls"[^>]*>)[\s\S]*?(<\/div>)/i, `$1${footerKeep}$2`);
            } else {
                // remove the controls container entirely
                docToLoad = finalHtml.replace(/<div\s+id="controls">[\s\S]*?<\/div>/i, "");
            }
        }
        preview.srcdoc = docToLoad;
    } catch (error) {
        console.error(error);
        showPreviewError(error);
    }
}

async function loadSet(setId) {
    currentSetId = setId;
    const set = SETS[setId];
    selectedComponentTag = "";
    selectedComponentPath = "";
    selectedComponentIndex = 0;
    clearTimeout(componentRefreshTimer);
    closeComponentInspector();
    setInfoPanelOpen(false);
    setControlsPanelOpen(false);

    sources.clear();
    originalSources.clear();
    disposeModels();
    currentSetFiles = null;

    const resolved = await resolveSetFiles(set);

    if (!resolved.css.main) {
        resolved.css.main = { path: setPath(set, "css.css"), text: "" };
    }
    if (!resolved.javascript.main) {
        resolved.javascript.main = { path: setPath(set, "javascript.mjs"), text: "" };
    }
    if (!resolved.readme) {
        resolved.readme = {
            path: setPath(set, "README.md"),
            text: "# README\n\nNo README.md provided yet."
        };
    }
    if (!resolved.docs) {
        const fallbackPath =
            typeof set.docs === "string" && set.docs.trim().length > 0 ? set.docs : "./docs/index.html";
        resolved.docs = { path: fallbackPath, text: "<!-- No docs page found for this example. -->" };
    }

    resolvedBySet.set(setId, resolved);

    currentSetFiles = {
        html: resolved.html.main,
        controls: resolved.controls || null,
        javascript: resolved.javascript.main,
        css: resolved.css.main,
        readme: resolved.readme,
        docs: resolved.docs
    };

    for (let i = 0; i < FILE_TABS.length; i += 1) {
        const key = FILE_TABS[i];
        const file = currentSetFiles[key];
        if (!file) continue;

        sources.set(file.path, file.text || "");
        if (EDITABLE_TABS.has(key)) {
            originalSources.set(file.path, file.text || "");
        }

        if (key === "docs") {
            continue;
        }

        const uri = monaco.Uri.parse(`inmemory://animation-examples${file.path.replace("./", "/")}`);
        const model = monaco.editor.createModel(file.text || "", pathLanguage(file.path), uri);
        if (EDITABLE_TABS.has(key)) {
            model.onDidChangeContent(() => {
                sources.set(file.path, model.getValue());
                queueRender();
                if (key === "html" || key === "controls") {
                    queueComponentRefresh();
                }
            });
        }
        models.set(file.path, model);
    }

    switchFile("html");
    refreshSceneComponents();
}

function initSetOptions() {
    const ids = Object.keys(SETS);
    for (let i = 0; i < ids.length; i += 1) {
        const id = ids[i];
        const option = document.createElement("option");
        option.value = id;
        option.textContent = SETS[id].label;
        setSelect.appendChild(option);
    }
    setSelect.value = currentSetId;
}

function resetCurrentSet() {
    for (const [path, original] of originalSources.entries()) {
        sources.set(path, original);
        const model = models.get(path);
        if (model) model.setValue(original);
    }
    renderPreview();
    refreshSceneComponents();
}

editor = monaco.editor.create(document.getElementById("editor"), {
    value: "",
    language: "html",
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 13,
    tabSize: 2,
    scrollBeyondLastLine: false,
    theme: "vs"
});

initSetOptions();
componentManifest = await loadComponentManifest();
renderComponentButtons();
refreshInfoReadout();

setSelect.addEventListener("change", () => {
    loadSet(setSelect?.value).catch((error) => {
        console.error(error);
        showPreviewError(error);
    });
});

resetFilesButton?.addEventListener("click", () => {
    resetCurrentSet();
});

preview?.addEventListener("load", () => {
    bindPreviewChromeEvents();
    refreshSceneComponents();
    refreshInfoReadout();
    if (selectedComponentTag) {
        renderComponentInspector();
    }
    // Auto-open controls for Particle World set so example footer controls are visible immediately.
    try {
        if (currentSetId === "particle_world") {
            // Delay slightly to allow DOM composition inside the preview iframe.
            setTimeout(() => {
                try {
                    setControlsPanelOpen(true);
                    // If mask drawer exists, open mask panel too so mask UI is visible.
                    setMaskPanelOpen(true);
                } catch (_err) {
                    // ignore failures
                }
            }, 120);
        }
    } catch (_e) {
        // ignore
    }
});

window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const ui = getPreviewUi();
    if (ui?.inspectorOverlayEl?.classList.contains("open")) {
        closeComponentInspector();
    }
    if (ui?.infoPanelEl?.classList.contains("open")) {
        setInfoPanelOpen(false);
    }
    if (ui?.footerEl?.classList.contains("open")) {
        setControlsPanelOpen(false);
    }
});

loadSet(currentSetId).catch((error) => {
    console.error(error);
    showPreviewError(error);
});

const resizeHandle = document.getElementById("resize-handle");
let isResizing = false;
let resizePointerId = null;

resizeHandle?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    resizePointerId = e.pointerId;
    if (typeof resizeHandle.setPointerCapture === "function") {
        resizeHandle.setPointerCapture(e.pointerId);
    }
    resizeHandle.classList.add("resizing");
    isResizing = true;
});

window.addEventListener("pointermove", (e) => {
    if (!isResizing) return;
    if (resizePointerId !== null && e.pointerId !== resizePointerId) return;
    const containerRect = document.getElementById("playground-panels").getBoundingClientRect();
    const offsetX = e.clientX - containerRect.left;
    const percentage = offsetX / containerRect.width;
    document.documentElement.style.setProperty("--preview-width", `${percentage * 100}%`);
});

window.addEventListener("pointerup", (e) => {
    if (!isResizing) return;
    if (resizePointerId !== null && e.pointerId !== resizePointerId) return;
    isResizing = false;
    resizePointerId = null;
    resizeHandle?.classList.remove("resizing");
    if (resizeHandle && typeof resizeHandle.releasePointerCapture === "function") {
        try {
            resizeHandle.releasePointerCapture(e.pointerId);
        } catch (_error) {
            // Ignore pointer capture release failures.
        }
    }
});

const panel1Tabs = document.querySelector("#panel-1-tabs");
const p1tabs = panel1Tabs?.querySelectorAll("li");

Array.from(p1tabs || []).forEach((tab) => {
    tab.addEventListener("click", () => {
        if (tab.hasAttribute("disabled")) return;
        Array.from(p1tabs || []).forEach((t) => t.classList.remove("active"));
        document.querySelector(".tab.active")?.classList.remove("active");
        document.querySelector(".tab-content.active")?.classList.remove("active");
        tab.classList.add("active");
        const target = tab.getAttribute("data-tab");
        const content = document.querySelector(`.tab-content[data-tab="${target}"]`);
        if (content) {
            content.classList.add("active");
        }
    });
});

function disableTab(tabName) {
    const tab = document.querySelector(`#panel-1-tabs li[data-tab="${tabName}"]`);
    if (tab) {
        tab.setAttribute("disabled", "true");
        if (tab.classList.contains("active")) {
            tab.classList.remove("active");
            const content = document.querySelector(`.tab-content[data-tab="${tabName}"]`);
            if (content) {
                content.classList.remove("active");
            }
            // Activate the first available tab
            const firstEnabledTab = document.querySelector(`#panel-1-tabs li:not([disabled])`);
            if (firstEnabledTab) {
                firstEnabledTab.click();
            }
        }
    }
}

function setTabContent(tabName, content) {
    const tabEl = document.querySelector(`#panel-1-tabs li[data-tab="${tabName}"]`);
    if (tabEl.hasAttribute("disabled")) {
        tabEl.removeAttribute("disabled");
    }
    const contentEl = document.querySelector(`.tab-content[data-tab="${tabName}"]`);
    if (contentEl) {
        contentEl.innerHTML = content;
    }
}
